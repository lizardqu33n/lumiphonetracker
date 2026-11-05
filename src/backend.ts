import type { LlmMessageDTO, SpindleAPI } from "lumiverse-spindle-types";
import { BUILD_STEP, EXTENSION_NAME, isRecord } from "./shared";
import { PhoneStore } from "./phone-store";
import { DOCUMENT_KEY } from "./phone-store";
import { transformTags } from "./tags";
import { registerPhoneMacros, registerPhoneMacroTemplates } from "./phone-macros";
import { trimPhoneHistory } from "./retention";
import { PreferenceStore, defaultPreferences } from "./preferences";
import { MessageReads, emptyReads } from "./message-reads";
import { chatPath } from "./store";
import { HelperAI } from "./helper";
import { HelperFailure, failureCategory } from "./helper-status";

declare const spindle: SpindleAPI;
const warn = (text: string): void => { try { spindle.log.warn(text); } catch { /* Logging cannot block generation. */ } };

const preferences = new PreferenceStore({
  read: async userId => spindle.userStorage.getJson("appearance.json", { fallback: defaultPreferences(), userId }),
  write: async (userId, value) => spindle.userStorage.setJson("appearance.json", value, { userId }),
});
const messageReads = new MessageReads({
  read: (userId, chatId) => spindle.userStorage.getJson(`message-reads/${chatPath(chatId)}`, { fallback: emptyReads(), userId }),
  write: (userId, chatId, value) => spindle.userStorage.setJson(`message-reads/${chatPath(chatId)}`, value, { userId }),
});

const store = new PhoneStore({
  warn: text => warn(text),
  authorize: async (chatId, userId) => (await spindle.chats.get(chatId, userId))?.id === chatId,
  history: async chatId => spindle.chat.getMessages(chatId),
  read: async chatId => spindle.variables.chat.get(chatId, DOCUMENT_KEY),
  write: async (chatId, data) => spindle.variables.chat.set(chatId, DOCUMENT_KEY, data),
  player: async (chatId, userId) => {
    const result = await spindle.macros.resolve("{{user}}", { chatId, userId, commit: false });
    const name = result.text.trim();
    return result.diagnostics.length || !name || name.includes("{{") ? null : name;
  },
  legacy: async (userId, path) => {
    if (!(await spindle.userStorage.exists(path, userId))) return null;
    return JSON.parse(await spindle.userStorage.read(path, userId));
  },
});
async function loadPhoneDocument(chatId: string, userId: string) {
  const doc=await store.preview(chatId, userId);
  if(doc.settings.source==="helper") {
    let usable=false;
    if(spindle.permissions.has("generation")&&doc.helperOwner===userId)try{usable=(await spindle.connections.list(userId)).some(c=>c.id===doc.settings.connection_id);}catch{/* Fail closed without generating. */}
    if(!usable)doc.settings={...doc.settings,source:"main"}; // Pull previews stay read-only.
  }
  return doc;
}
registerPhoneMacros(spindle,loadPhoneDocument);
const helper = new HelperAI(store, {
  allowed: () => spindle.permissions.has("generation") && spindle.permissions.has("chats") && spindle.permissions.has("chat_mutation"),
  connections: async userId => (await spindle.connections.list(userId)).map(c => ({ id:c.id, name:c.name, model:c.model })),
  generate: async input => {
    const result=await spindle.generate.raw({type:"raw",...input});
    if(!isRecord(result)||typeof result.content!=="string")throw new HelperFailure("invalid output");
    return {content:result.content,finish_reason:typeof result.finish_reason==="string"?result.finish_reason:""};
  },
  changed: (userId,chatId) => spindle.sendToFrontend({type:"phone_helper_changed",chatId},userId),
  warn: text => warn(text),
});
if (spindle.frontendCapabilities?.declare) spindle.frontendCapabilities.declare("message_tag_interceptor");
else warn("Lumi Phone Tracker: host lacks documented cold-load tag hiding; update Lumiverse.");

let processorRegistered = false;
let interceptorRegistered = false;
let macroTemplatesRegistered = false;
let helperHooks: (()=>void)[] = [];
function registerHooks(): void {
  if (!macroTemplatesRegistered && spindle.permissions.has("macro_interceptor")) {
    registerPhoneMacroTemplates(spindle,loadPhoneDocument);
    macroTemplatesRegistered = true;
  }
  if(spindle.permissions.has("generation") && !helperHooks.length) {
    helperHooks.push(spindle.on("GENERATION_STARTED",(payload,userId)=>{
      if(typeof payload.chatId!=="string"||typeof payload.generationId!=="string")return;
      helper.started(payload.chatId,payload.generationId);
      if(userId)spindle.sendToFrontend({type:"phone_helper_changed",chatId:payload.chatId},userId);
    }),spindle.on("GENERATION_ENDED",(payload,userId)=>{
      if(typeof payload.chatId!=="string"||typeof payload.generationId!=="string")return;
      helper.ended(userId,payload);
      if(userId)spindle.sendToFrontend({type:"phone_helper_changed",chatId:payload.chatId},userId);
    }),spindle.on("GENERATION_STOPPED",(payload,userId)=>{
      if(typeof payload.chatId!=="string"||typeof payload.generationId!=="string")return;
      helper.stopped(payload.chatId,payload.generationId);
      if(userId)spindle.sendToFrontend({type:"phone_helper_changed",chatId:payload.chatId},userId);
    }));
  } else if(!spindle.permissions.has("generation") && helperHooks.length) { helperHooks.forEach(fn=>fn());helperHooks=[];helper.cancelAll(); }
  if (!processorRegistered && spindle.permissions.has("chat_mutation")) {
    spindle.registerMessageContentProcessor(async ctx => {
      // No write-time transformations: saved source keeps every tag.
      if (ctx.origin !== "render") return;
      const content = transformTags(ctx.content, "display");
      return content === ctx.content ? undefined : { content };
    }, 50);
    processorRegistered = true;
  }
  if (!interceptorRegistered && spindle.permissions.has("interceptor")) {
    const handler = async (messages: LlmMessageDTO[], context: { chatId?: string; userId?: string }) => {
      try {
        if (!context || typeof context.chatId !== "string" || !context.chatId || typeof context.userId !== "string" || !context.userId.trim()) {
          warn("Lumi Phone Tracker: prompt context unavailable; prompt unchanged.");
          return messages;
        }
        const document = await store.preview(context.chatId, context.userId);
        return trimPhoneHistory(messages, document.settings, document);
      } catch {
        warn("Lumi Phone Tracker: prompt processing failed; prompt unchanged.");
        return messages;
      }
    };
    // Optional: even a worker timeout must not stop the user's generation.
    spindle.registerInterceptor(handler, 1000);
    interceptorRegistered = true;
  }
}
registerHooks();
spindle.permissions.onChanged(() => registerHooks());

function requireReadPermissions(): void {
  if (!spindle.permissions.has("chats") || !spindle.permissions.has("chat_mutation")) throw new Error("Allow chat access in Extensions.");
}
spindle.onFrontendMessage((payload, userId) => {
  if (typeof userId !== "string" || !userId.trim()) {
    if(isRecord(payload)&&["phone_connections","phone_helper_now"].includes(String(payload.type)))warn("Lumi Phone Tracker: Helper AI: permission missing.");
    else warn("Lumi Phone Tracker: frontend user context unavailable; request ignored.");
    return; // Never turn a reply into an operator-wide broadcast.
  }
  if(isRecord(payload) && ["phone_connections","phone_helper_now"].includes(String(payload.type)) && typeof payload.requestId==="string" && payload.requestId.length<=100 && typeof payload.chatId==="string" && payload.chatId.length<=256) {
    void(async()=>{
      requireReadPermissions();
      await store.sync(userId,payload.chatId as string); // Authorization before connection selection or a request.
      if(payload.type==="phone_connections") {
        const info=await helper.connections(userId,payload.chatId as string);
        spindle.sendToFrontend({type:"phone_connections_result",requestId:payload.requestId,chatId:payload.chatId,info},userId);
      } else {
        const result=await helper.refresh(userId,payload.chatId as string);
        spindle.sendToFrontend({type:"phone_helper_now_result",requestId:payload.requestId,chatId:payload.chatId,result},userId);
      }
    })().catch(error=>{
      const category=failureCategory(error);warn(`Lumi Phone Tracker: Helper AI: ${category}.`);
      spindle.sendToFrontend({type:"phone_helper_error",requestId:payload.requestId,chatId:payload.chatId,category},userId);
    });
    return;
  }
  if (isRecord(payload) && payload.type === "phone_mark_read" && typeof payload.requestId === "string" && payload.requestId.length <= 100 &&
    typeof payload.chatId === "string" && payload.chatId.length <= 256 && typeof payload.key === "string" && payload.key.length <= 400 &&
    Array.isArray(payload.observed) && payload.observed.length <= 100000 && payload.observed.every(m => isRecord(m) && typeof m.id === "string" && m.id.length <= 2000 && typeof m.receipt === "string" && m.receipt.length <= 20000)) {
    void (async () => {
      requireReadPermissions();
      const snapshot = await store.sync(userId, payload.chatId as string);
      const reads = await messageReads.mark(userId, snapshot.chatId, payload.key as string, payload.observed as { id: string; receipt: string }[], snapshot.state.messages);
      spindle.sendToFrontend({ type: "phone_reads_result", requestId: payload.requestId, chatId: snapshot.chatId, reads }, userId);
    })().catch(() => spindle.sendToFrontend({ type: "phone_reads_error", requestId: payload.requestId, chatId: payload.chatId }, userId));
    return;
  }
  if (isRecord(payload) && ["phone_preferences", "phone_preferences_update"].includes(String(payload.type)) &&
    typeof payload.requestId === "string" && payload.requestId.length <= 100) {
    const task = payload.type === "phone_preferences" ? preferences.read(userId) : preferences.update(userId, payload.change);
    void task.then(value => spindle.sendToFrontend({ type: "phone_preferences_result", requestId: payload.requestId, preferences: value }, userId))
      .catch(() => spindle.sendToFrontend({ type: "phone_preferences_error", requestId: payload.requestId, message: "Appearance could not be saved. Try again." }, userId));
    return;
  }
  if (!isRecord(payload) || !["phone_sync", "phone_update"].includes(String(payload.type)) || typeof payload.requestId !== "string" ||
    payload.requestId.length > 100 || (payload.chatId !== undefined && payload.chatId !== null && typeof payload.chatId !== "string")) return;
  const requestId = payload.requestId;
  if (payload.type === "phone_update" && (typeof payload.chatId !== "string" || !payload.chatId)) return;
  void (async () => {
    requireReadPermissions();
    const chatId = typeof payload.chatId === "string" ? payload.chatId : payload.chatId===null?null:(await spindle.chats.getActive(userId))?.id;
    if (!chatId) { spindle.sendToFrontend({ type: "phone_snapshot", requestId, chatId: null }, userId); return; }
    let snapshot = payload.type === "phone_update" ? await store.update(userId, chatId,
      typeof payload.revision === "number" ? payload.revision : -1, { settings: payload.settings, edit: payload.edit, dismissNotice: payload.dismissNotice }) : await store.sync(userId, chatId);
    if(payload.type==="phone_update") {
      helper.cancel(chatId); // Revision changed: stop an older in-flight extraction.
      if(snapshot.settings.source==="helper" && snapshot.helperOwner===userId) { await helper.connections(userId,chatId); snapshot=await store.sync(userId,chatId); }
    }
    const reads = await messageReads.read(userId, chatId);
    const chatName=(await spindle.chats.get(chatId,userId))?.name??"";
    spindle.sendToFrontend({ type: "phone_snapshot", requestId, chatId, chatName, snapshot, reads, helperBusy:helper.busy(chatId) }, userId);
  })().catch(error => {
    const reason = error instanceof Error ? error.message : "";
    const known = ["The tracker changed.", "The story changed.", "This section is full.", "Contacts is full", "Locations is full", "A contact with that name", "A place with that name", "A note with that name"];
    const message = known.some(s => reason.startsWith(s)) ? reason : "Could not save or open this chat. Check extension permissions and try again.";
    spindle.sendToFrontend({ type: "phone_error", requestId, message }, userId);
    warn("Lumi Phone Tracker: chat sync failed; saved data retained.");
  });
});
// Story lifecycle is separate from generation completion; partial text never triggers Helper AI.
for (const event of ["MESSAGE_SENT", "MESSAGE_EDITED", "MESSAGE_DELETED", "MESSAGE_SWIPED", "SWIPE_EDITED", "CHAT_CHANGED"]) {
  spindle.on(event, (payload: unknown, userId?: string) => {
    if (!userId || !isRecord(payload) || typeof payload.chatId !== "string") return;
    const chatId = payload.chatId;
    if (!spindle.permissions.has("chats") || !spindle.permissions.has("chat_mutation")) return;
    void store.sync(userId, chatId).catch(() => warn("Lumi Phone Tracker: history update failed; saved data retained."));
  });
}
spindle.log.info(`${EXTENSION_NAME}: Step ${BUILD_STEP} loaded. Helper AI runs only after explicit selection.`);

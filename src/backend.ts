import {atOperation,failureDetails,logFailure} from "./diagnostics";
import {createPhoneInterceptor} from "./prompt-interceptor";
import {phoneSnapshot,snapshotReads} from "./ui-snapshot";
import { readStoryHistory } from "./history";
import { SetupChoiceStore } from "./setup-choices";
import {SetupWizard,SetupError} from "./setup-wizard";
import {cardNames} from "./card-access";
import { PersonalStore, emptyPersonal, builtInPresets, selectedWording } from "./personal-settings";
import { defaultWordingTemplate, formatMacro } from "./phone-macros";
import { emptyDocument } from "./model";
import {loadPortraitSources} from "./portrait-sources";
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
import { failureCategory } from "./helper-status";

declare const spindle: SpindleAPI;
const warn = (text: string): void => { try { spindle.log.warn(text); } catch { /* Logging cannot block generation. */ } };

const preferences = new PreferenceStore({
  read: async userId => spindle.userStorage.getJson("appearance.json", { fallback: defaultPreferences(), userId }),
  write: async (userId, value) => spindle.userStorage.setJson("appearance.json", value, { userId }),
});
const personal=new PersonalStore({read: userId=>spindle.userStorage.getJson("personal-settings.json",{fallback:emptyPersonal(),userId}),write:(userId,value)=>spindle.userStorage.setJson("personal-settings.json",value,{userId}),warn});
const mainWording=async(userId:string)=>selectedWording(await personal.read(userId),"main");
const messageReads = new MessageReads({
  read: (userId, chatId) => spindle.userStorage.getJson(`message-reads/${chatPath(chatId)}`, { fallback: emptyReads(), userId }),
  write: (userId, chatId, value) => spindle.userStorage.setJson(`message-reads/${chatPath(chatId)}`, value, { userId }),
});

const store = new PhoneStore({
  names:(chat,user)=>atOperation("card.names",()=>cardNames(spindle,chat,user)),
  warn: text => warn(text),
  authorize: async (chatId, userId) => (await atOperation("chat.authorize",()=>spindle.chats.get(chatId, userId)))?.id === chatId,
  history: async chatId => atOperation("history.read",()=>readStoryHistory(spindle,chatId)),
  read: async chatId => atOperation("tracker.read",()=>spindle.variables.chat.get(chatId, DOCUMENT_KEY)),
  write: async (chatId, data) => atOperation("tracker.write",()=>spindle.variables.chat.set(chatId, DOCUMENT_KEY, data)),
  player: async (chatId, userId) => {
    const result = await atOperation("player.resolve",()=>spindle.macros.resolve("{{user}}", { chatId, userId, commit: false }));
    const name = result.text.trim();
    return result.diagnostics.length || !name || name.includes("{{") ? null : name;
  },
  legacy: async (userId, path) => {
    if (!(await atOperation("legacy.exists",()=>spindle.userStorage.exists(path, userId)))) return null;
    return JSON.parse(await atOperation("legacy.read",()=>spindle.userStorage.read(path, userId)));
  },
});
async function loadPhoneDocument(chatId: string, userId: string) {
  const doc=await store.savedView(chatId, userId);
  if(doc.trackingEnabled===false)return doc;
  doc.settings.source="main";
  try{if(doc.settings.apps.Email&&doc.settings.enabled.email)doc.personalReads=await messageReads.read(userId,chatId);}catch{doc.personalReads={seen:{},available:false};warn("Lumi Phone Tracker: unread status unavailable; email continuity omitted.");}
  return doc;
}
registerPhoneMacros(spindle,loadPhoneDocument,mainWording);
const setupWizard=new SetupWizard(spindle,store);
const setupChoices=new SetupChoiceStore({
  authorize:async(user,chat)=>(await spindle.chats.get(chat,user))?.id===chat,
  read:(user,chat)=>spindle.userStorage.getJson(`setup-choices/${chatPath(chat)}`,{userId:user,fallback:[]}),
  write:(user,chat,choices)=>spindle.userStorage.setJson(`setup-choices/${chatPath(chat)}`,choices,{userId:user}),
});
if (spindle.frontendCapabilities?.declare) spindle.frontendCapabilities.declare("message_tag_interceptor");
else warn("Lumi Phone Tracker: host lacks documented cold-load tag hiding; update Lumiverse.");

let processorRegistered = false;
let interceptorRegistered = false;
let macroTemplatesRegistered = false;
function registerHooks(): void {
  if (!macroTemplatesRegistered && spindle.permissions.has("macro_interceptor")) {
    registerPhoneMacroTemplates(spindle,loadPhoneDocument,mainWording);
    macroTemplatesRegistered = true;
  }
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
    const handler=createPhoneInterceptor({settings:(chat,user,signal)=>store.settingsPreview(user,chat,signal),preview:(chat,user,signal)=>store.promptPreview(chat,user,signal),warn});
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
    if(isRecord(payload)&&["phone_connections","phone_refresh","phone_helper_now"].includes(String(payload.type)))warn("Lumi Phone Tracker: setup/refresh: permission missing.");
    else warn("Lumi Phone Tracker: frontend user context unavailable; request ignored.");
    return; // Never turn a reply into an operator-wide broadcast.
  }
  if(isRecord(payload)&&["phone_setup_prepare","phone_setup_run","phone_setup_save","phone_setup_choices","phone_setup_choices_save"].includes(String(payload.type))&&typeof payload.requestId==="string"&&payload.requestId.length<=100&&typeof payload.chatId==="string"&&payload.chatId.length<=256){
    void(async()=>{requireReadPermissions();const chat=payload.chatId as string;let result:unknown;if(payload.type==="phone_setup_choices"||payload.type==="phone_setup_choices_save")result={choices:await setupChoices.access(userId,chat,payload.type==="phone_setup_choices_save",payload.choices)};else if(payload.type==="phone_setup_prepare")result=await setupWizard.prepare(userId,chat,payload.choices);else{if(typeof payload.id!=="string"||payload.id.length>100)throw new SetupError("Review setup first.");if(payload.type==="phone_setup_run")result=await setupWizard.run(userId,chat,payload.id);else{if(payload.confirm!==true)throw new SetupError("Confirm the setup preview before saving.");result={snapshot:phoneSnapshot(await setupWizard.save(userId,chat,payload.id,payload.decisions))};}}spindle.sendToFrontend({type:"phone_setup_result",requestId:payload.requestId,chatId:chat,result},userId);})().catch(error=>{warn(error instanceof SetupError&&error.category?`Lumi Phone Tracker: setup failed: ${error.category}.`:"Lumi Phone Tracker: setup request failed; check saved state.");spindle.sendToFrontend({type:"phone_setup_error",requestId:payload.requestId,chatId:payload.chatId,message:error instanceof SetupError?error.message:"Setup could not finish. Check access and the tracker before trying again."},userId);});return;
  }
  if(isRecord(payload)&&payload.type==="phone_personal"&&typeof payload.requestId==="string"&&payload.requestId.length<=100) {
    void(async()=>{
      const chatId=typeof payload.chatId==="string"&&payload.chatId.length<=256?payload.chatId:null;
      const change=payload.change;if(isRecord(change)&&change.target==="helper")throw Error("Automatic connection tracking was removed.");
      let doc=chatId?(requireReadPermissions(),isRecord(change)&&change.kind==="preview"&&change.target==="main"?await loadPhoneDocument(chatId,userId):await store.settingsPreview(userId,chatId)):null;
      let value=await personal.read(userId);let snapshot:unknown;
      if(isRecord(change)&&change.kind==="preset_apply") {
        if(!doc||change.confirm!==true)throw Error("Confirm applying to this chat.");
        const preset=[...builtInPresets(),...value.presets].find(p=>p.id===change.id);if(!preset)throw Error("Preset not found.");
        snapshot=await store.update(userId,doc.chatId,Number(payload.chatRevision),{settings:preset.settings});
        doc=snapshot as typeof doc;
      } else if(change!==undefined&&(!isRecord(change)||change.kind!=="preview")) {
        if(isRecord(change)&&change.kind==="preset_save"&&(!doc||doc.revision!==payload.chatRevision))throw Error("The chat changed. Reopen it first.");
        value=await personal.update(userId,Number(payload.revision),change,doc?.settings);
      }
      let preview:unknown;
      if(isRecord(change)&&change.kind==="preview") {
        if(!doc)throw Error("Open a chat first.");
        if(change.target!=="main")throw Error("Only tracker wording is editable.");
        let note="";const warning=(s:string)=>{warn(s);note=s.includes("missing syntax")?"Generated syntax appended: [[phone_syntax]] is missing.":s.includes("repeated")?"Extra syntax placeholders were removed.":"Invalid wording. Default is in use.";};
        const text=change.text===undefined?selectedWording(value,change.target):change.text;
        const custom=typeof text==="string"?text:undefined;
        const output=formatMacro(doc,custom,warning);
        preview={text:output,characters:output.length,tokenEstimate:Math.ceil(output.length/4),warning:note};
      }
      const base=doc??emptyDocument("");
      spindle.sendToFrontend({type:"phone_personal_result",requestId:payload.requestId,chatId,personal:value,templates:{main:defaultWordingTemplate(base),helper:""},snapshot:snapshot?phoneSnapshot(snapshot as import("./model").Document):undefined,preview},userId);
    })().catch(()=>spindle.sendToFrontend({type:"phone_personal_error",requestId:payload.requestId,message:"Could not save. Check the name, limits and current chat; then try again."},userId));return;
  }
  if(isRecord(payload)&&payload.type==="phone_portraits"&&typeof payload.chatId==="string"&&payload.chatId.length<=256&&typeof payload.requestId==="string"&&payload.requestId.length<=100){
    void(async()=>{requireReadPermissions();const doc=await store.settingsPreview(userId,payload.chatId as string);if(doc.trackingEnabled===false){spindle.sendToFrontend({type:"phone_portraits_result",requestId:payload.requestId,chatId:doc.chatId,sources:{characters:[]}},userId);return;}const player=await spindle.macros.resolve("{{user}}",{chatId:doc.chatId,userId,commit:false});const sources=await loadPortraitSources(spindle,doc.chatId,userId,!player.diagnostics.length?player.text.trim():undefined);spindle.sendToFrontend({type:"phone_portraits_result",requestId:payload.requestId,chatId:doc.chatId,sources},userId);})().catch(()=>spindle.sendToFrontend({type:"phone_portraits_result",requestId:payload.requestId,chatId:payload.chatId,sources:{characters:[]}},userId));return;
  }
  if(isRecord(payload) && ["phone_connections","phone_refresh","phone_helper_now"].includes(String(payload.type)) && typeof payload.requestId==="string" && payload.requestId.length<=100 && typeof payload.chatId==="string" && payload.chatId.length<=256) {
    void(async()=>{
      requireReadPermissions();
      await store.settingsPreview(userId,payload.chatId as string);
      if(payload.type==="phone_connections") {
        const doc=await store.settingsPreview(userId,payload.chatId as string);
        const available=doc.trackingEnabled!==false&&spindle.permissions.has("generation");
        const profiles=available?await spindle.connections.list(userId):[];
        const info={available,choices:profiles.map(c=>({id:c.id,label:[c.name,c.model].filter(Boolean).join(" - ")})),note:available?"":"Allow generation permission to use the setup wizard."};
        spindle.sendToFrontend({type:"phone_connections_result",requestId:payload.requestId,chatId:payload.chatId,info},userId);
      } else {
        const doc=await store.sync(userId,payload.chatId as string);const result={ok:doc.trackingEnabled!==false};
        spindle.sendToFrontend({type:payload.type==="phone_refresh"?"phone_refresh_result":"phone_helper_now_result",requestId:payload.requestId,chatId:payload.chatId,result},userId);
      }
    })().catch(error=>{
      const category=failureCategory(error);warn(`Lumi Phone Tracker: setup/refresh: ${category}.`);
      spindle.sendToFrontend({type:"phone_helper_error",requestId:payload.requestId,chatId:payload.chatId,category},userId);
    });
    return;
  }
  if (isRecord(payload) && payload.type === "phone_mark_read" && typeof payload.requestId === "string" && payload.requestId.length <= 100 &&
    typeof payload.chatId === "string" && payload.chatId.length <= 256 && typeof payload.key === "string" && payload.key.length <= 400 &&
    Array.isArray(payload.observed) && payload.observed.length <= 100000 && payload.observed.every(m => isRecord(m) && typeof m.id === "string" && m.id.length <= 2000 && typeof m.receipt === "string" && m.receipt.length <= 20000)) {
    void (async () => {
      requireReadPermissions();
      const snapshot = await store.preview(payload.chatId as string,userId);
      if(snapshot.trackingEnabled===false)throw Error("Tracking is off.");
      const reads = await messageReads.mark(userId, snapshot.chatId, payload.key as string, payload.observed as { id: string; receipt: string }[], snapshot.state.messages,snapshot.state);
      spindle.sendToFrontend({ type: "phone_reads_result", requestId: payload.requestId, chatId: snapshot.chatId, reads:snapshotReads(reads,phoneSnapshot(snapshot)) }, userId);
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
  let stage="permissions", committed=false;
  void (async () => {
    requireReadPermissions();
    stage="chat.resolve";
    const chatId = typeof payload.chatId === "string" ? payload.chatId : payload.chatId===null?null:(await spindle.chats.getActive(userId))?.id;
    if (!chatId) { spindle.sendToFrontend({ type: "phone_snapshot", requestId, chatId: null }, userId); return; }
    if(isRecord(payload.settings)&&payload.settings.source==="helper")throw Error("Automatic connection tracking was removed.");
    stage=payload.type === "phone_update"?"tracker.update":"tracker.open";
    let snapshot = payload.type === "phone_update" ? await store.update(userId, chatId,
      typeof payload.revision === "number" ? payload.revision : -1, { trackingEnabled:payload.trackingEnabled, settings: payload.settings, edit: payload.edit, dismissNotice: payload.dismissNotice,portrait:payload.portrait,contactInfo:payload.contactInfo,fieldControl:payload.fieldControl,mergeContacts:payload.mergeContacts }) : await store.openView(chatId,userId);
    committed=payload.type==="phone_update";
    if(payload.type==="phone_update") {
      if(payload.trackingEnabled===true)snapshot=await store.sync(userId,chatId);
    }
    stage="receipts.read";
    const reads = snapshot.trackingEnabled===false?emptyReads():await messageReads.read(userId, chatId);
    stage="chat.metadata";
    const chatName=(await spindle.chats.get(chatId,userId))?.name??"";
    stage="frontend.notify";
    spindle.sendToFrontend({ type: "phone_snapshot", requestId, chatId, chatName, snapshot:phoneSnapshot(snapshot), reads:snapshotReads(reads,phoneSnapshot(snapshot)), helperBusy:false }, userId);
  })().catch(error => {
    const reason = error instanceof Error ? error.message : "";
    const known = ["Invalid contact details", "Reopen this contact.", "Outgoing player entries need", "This app is full.", "An account with that name", "The tracker changed.", "The story changed.", "This section is full.", "Contacts is full", "Locations is full", "A contact with that name", "A place with that name", "A note with that name"];
    const message = known.some(s => reason.startsWith(s)) ? reason : "Could not save or open this chat. Check extension permissions and try again.";
    const conflict = failureDetails(error).category.startsWith("conflict.");
    logFailure(warn,{operation:stage,event:String(payload.type),outcome:committed?"update-committed":"operation-not-completed"},error);
    try { spindle.sendToFrontend({ type: "phone_error", requestId, message, ...(conflict ? { conflict: true } : {}) }, userId); }
    catch (notifyError) { logFailure(warn,{operation:"frontend.error-notify",event:String(payload.type),outcome:"notification-failed"},notifyError); }
  });
});
// Only trusted saved-message events commit automatic tracker updates. Streaming tokens do not.
for(const event of ["MESSAGE_SENT","MESSAGE_EDITED","MESSAGE_DELETED","MESSAGE_SWIPED","SWIPE_EDITED","CHAT_CHANGED"]){
 spindle.on(event,(payload:unknown,userId?:string)=>{
  if(!userId||!isRecord(payload)||typeof payload.chatId!=="string"||!spindle.permissions.has("chats")||!spindle.permissions.has("chat_mutation"))return;
  const chatId=payload.chatId,m=payload.message;
  const row=event==="MESSAGE_SENT"&&isRecord(m)&&typeof m.id==="string"&&m.chat_id===chatId&&Number.isInteger(m.index_in_chat)&&typeof m.content==="string"&&Number.isInteger(m.swipe_id)&&typeof m.is_user==="boolean"&&!(isRecord(m.extra)&&m.extra.spindle_role!==undefined)?{id:m.id,chat_id:chatId,index_in_chat:m.index_in_chat as number,content:m.content,swipe_id:m.swipe_id as number,swipe_dates:Array.isArray(m.swipe_dates)?m.swipe_dates as number[]:undefined,role:m.is_user?"user" as const:"assistant" as const,...(typeof m.name==="string"?{name:m.name}:{})}:null;
  const work=row?store.receiveSaved(userId,chatId,row):store.sync(userId,chatId);
  void work.then(()=>{
    try { spindle.sendToFrontend({type:"phone_tracker_changed",chatId},userId); }
    catch(error) { logFailure(warn,{operation:"frontend.notify",event,outcome:"tracker-operation-completed"},error); }
  },error=>logFailure(warn,{operation:row?"tracker.append":"tracker.sync",event,outcome:"operation-not-completed"},error));
 });
}
spindle.log.info(`${EXTENSION_NAME}: saved-message tracking loaded. Model requests are setup-wizard only.`);

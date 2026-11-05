/** Isolated browser-test fixtures only. This file is never imported by the extension. */
import { setup } from "../src/frontend";
import { PhoneStore } from "../src/phone-store";
import { PreferenceStore, defaultPreferences } from "../src/preferences";
import type { StoryRow } from "../src/engine";
import { isRecord } from "../src/shared";
import { MessageReads, emptyReads } from "../src/message-reads";
import { replyTag } from "../src/messages";
import { HelperAI, type HelperIO } from "../src/helper";

const docs = new Map<string, string>(); const histories = new Map<string, StoryRow[]>();
let prefs: unknown = defaultPreferences(); let activeChat: string | null = "a"; let updateDelay = 0;
let onBackend: (p: unknown) => void = () => {}; const events = new Map<string, Set<(p: unknown) => void>>();
const tagHandlers: { options: unknown; callback: (p: unknown) => void }[] = [];
let cleanup: (() => void) | undefined; let tagCalls = 0; let granted = ["chats", "chat_mutation", "interceptor", "ui_panels"];
let failAppearanceSave = false; let failWidget = false;
const readFiles = new Map<string, unknown>();
let composerState = { mounted: true, chatId: "a" as string | null, text: "" }; let focusCount = 0; let sendCalls = 0;
const readStore = new MessageReads({ read: async (u,c) => structuredClone(readFiles.get(`${u}/${c}`) ?? emptyReads()), write: async (u,c,v) => { readFiles.set(`${u}/${c}`, structuredClone(v)); } });
const store = new PhoneStore({ authorize: async (chat, user) => user === `owner-${chat}`,
  read: async chat => docs.get(chat) ?? "", write: async (chat, data) => { docs.set(chat, data); },
  history: async chat => structuredClone(histories.get(chat) ?? []), player: async () => "Player" });
const preferenceStore = new PreferenceStore({ read: async () => prefs, write: async (_u, value) => { prefs = structuredClone(value); } });
let helperProfiles=[{id:"small",name:"Saved small connection",model:"Small test model"}];let helperDelay=0;let helperOutput='{"weather":"Clear skies"}';const helperCalls:Parameters<HelperIO["generate"]>[0][]=[];
const helper=new HelperAI(store,{allowed:()=>granted.includes("generation"),connections:async()=>helperProfiles,generate:async input=>{helperCalls.push(input);await new Promise(resolve=>setTimeout(resolve,helperDelay));return {content:helperOutput,finish_reason:"stop"};},changed:(_,chatId)=>onBackend({type:"phone_helper_changed",chatId}),warn:()=>{}});
const sendToBackend = (payload: unknown) => {
  if (!isRecord(payload)) return;
  const id = payload.requestId; const chat = payload.chatId===null?"":String(payload.chatId ?? activeChat ?? ""); const reply = onBackend;
  const run = async () => {
    try {
      if (payload.type === "phone_preferences" || payload.type === "phone_preferences_update") {
        if (payload.type === "phone_preferences_update" && failAppearanceSave) {
          reply({ type: "phone_preferences_error", requestId: id, message: "Appearance could not be saved." }); return;
        }
        const preferences = payload.type === "phone_preferences" ? await preferenceStore.read("user") : await preferenceStore.update("user", payload.change);
        const delay = payload.type === "phone_preferences" && new URL(location.href).searchParams.has("stale-appearance") ? 400 : 0;
        setTimeout(() => reply({ type: "phone_preferences_result", requestId: id, preferences }), delay); return;
      }
      if (!chat) { reply({ type: "phone_snapshot", requestId: id, chatId: null }); return; }
      if(payload.type==="phone_connections"){const info=await helper.connections(`owner-${chat}`,chat);reply({type:"phone_connections_result",requestId:id,chatId:chat,info});return;}
      if(payload.type==="phone_helper_now"){const result=await helper.refresh(`owner-${chat}`,chat);reply({type:"phone_helper_now_result",requestId:id,chatId:chat,result});return;}
      if (payload.type === "phone_mark_read") {
        const snapshot = await store.sync(`owner-${chat}`,chat);
        const reads = await readStore.mark("user", chat, String(payload.key), payload.observed as { id: string; receipt: string }[], snapshot.state.messages,snapshot.state);
        reply({ type: "phone_reads_result", requestId: id, chatId: chat, reads }); return;
      }
      let snapshot = payload.type === "phone_update" ? await store.update(`owner-${chat}`, chat, Number(payload.revision), { edit: payload.edit, settings: payload.settings, dismissNotice: payload.dismissNotice }) : await store.sync(`owner-${chat}`, chat);
      if(payload.type==="phone_update"){helper.cancel(chat);if(snapshot.settings.source==="helper"){await helper.connections(`owner-${chat}`,chat);snapshot=await store.sync(`owner-${chat}`,chat);}}
      reply({ type: "phone_snapshot", requestId: id, chatId: chat, chatName:chat==="a"?"Lantern story":"Other story", snapshot, reads: await readStore.read("user",chat),helperBusy:helper.busy(chat) });
    } catch (e) { reply({ type: payload.type === "phone_mark_read" ? "phone_reads_error" : "phone_error", requestId: id, chatId:chat, message: e instanceof Error ? e.message : "Failed" }); }
  };
  setTimeout(() => { void run(); }, payload.type === "phone_update" ? updateDelay : 0);
};
const ctx = {
  components:{mountSwitch:(target:HTMLElement,options:{checked:boolean;disabled:boolean;ariaLabel:string;onChange:(v:boolean)=>void})=>{
    const input=document.createElement("input");input.type="checkbox";input.checked=options.checked;input.disabled=options.disabled;input.setAttribute("role","switch");input.setAttribute("aria-label",options.ariaLabel);input.addEventListener("change",()=>options.onChange(input.checked));target.append(input);return {destroy:()=>input.remove(),update:()=>{},getValue:()=>input.checked};
  }},
  host: { capabilities: { "composer-v1": 1 } },
  composer: {
    getState: () => ({ ...composerState }),
    insertText: (text: string, options: { at: string }) => { if (!composerState.mounted || options.at !== "end") throw new Error("Wrong composer operation"); composerState.text += text; },
    focus: () => { focusCount++; },
    send: () => { sendCalls++; throw new Error("The extension must never send"); },
  },
  dom: { addStyle: (css: string) => { const style = document.createElement("style"); style.textContent = css; document.head.append(style); return () => style.remove(); } },
  messages: { registerTagInterceptor: (options: unknown, callback: (p: unknown) => void) => { const item = { options, callback }; tagHandlers.push(item); tagCalls++; return () => { const i = tagHandlers.indexOf(item); if (i >= 0) tagHandlers.splice(i, 1); }; } },
  ui: {
    registerDrawerTab: () => {
      const root = document.createElement("div"); root.className = "harness-drawer"; document.body.append(root);
      const activations = new Set<() => void>();
      return { root, destroy: () => root.remove(), onActivate: (fn: () => void) => { activations.add(fn); return () => activations.delete(fn); }, activate: () => activations.forEach(fn => fn()) };
    },
    createFloatWidget: (options: { width: number; height: number }) => {
      if (failWidget) throw new Error("Simulated placement failure");
      const query = new URL(location.href).searchParams;
      const delayed = query.has("delayed-root"); let mounted = !delayed; let destroyed = false;
      const placement = document.createElement("div"); placement.className = "harness-widget";
      if (!delayed) document.body.append(placement);
      const autoRoot = new URL(location.href).searchParams.has("auto-root");
      const root = autoRoot ? document.createElement("div") : placement;
      if (autoRoot) { root.className = "harness-widget-root"; placement.append(root); }
      let x = 24; let y = 110;
      let requestedWidth = options.width; let requestedHeight = options.height;
      const bounds = () => { placement.style.width = `${mounted ? requestedWidth : 0}px`; placement.style.height = `${mounted ? requestedHeight : 0}px`; };
      bounds(); placement.style.left = `${x}px`; placement.style.top = `${y}px`;
      if (delayed) setTimeout(() => { if (!destroyed) { mounted = true; document.body.append(placement); bounds(); } }, 160);
      return { root, widgetId: "harness-phone", setSize: (w: number, h: number) => { requestedWidth = w; requestedHeight = h; bounds(); },
        moveTo: (nx: number, ny: number) => { x = nx; y = ny; placement.style.left = `${x}px`; placement.style.top = `${y}px`; }, getPosition: () => ({ x, y }), destroy: () => { destroyed = true; placement.remove(); } };
    },
  },
  permissions: { getGranted: async () => granted },
  getActiveChat: () => ({ chatId: activeChat, characterId: null }),
  sendToBackend, onBackendMessage: (fn: typeof onBackend) => { onBackend = fn; return () => { if (onBackend === fn) onBackend = () => {}; }; },
  events: { on: (event: string, fn: (p: unknown) => void) => { const set = events.get(event) ?? new Set(); set.add(fn); events.set(event, set); return () => set.delete(fn); } },
};
const block = (data: Record<string, unknown>) => `<phone-state>\n${Object.entries(data).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join("\n")}\n</phone-state>`;
const fixtureRow = (chat: string): StoryRow => ({ id: `${chat}-0`, chat_id: chat, index_in_chat: 1, swipe_id: 0, role: "assistant",
  content: "Ada and Player wait at the Lantern Cafe in Northport. Bea stays at the Station. The Bridge is closed. Ada promises a meeting at dusk. Ivo is only mentioned, offscreen." + block({
    location: { name: chat === "a" ? "Lantern Cafe" : "Other chat", wider: ["Northport", "Lakes Province"] }, time: "Late afternoon", date: "Monday",
    present: ["Ada", "Player"], weather: "Soft rain outside",
    contacts: [{ name: "Ada", roles: ["Guide", "Friend"], physical: "A bandaged right hand", mood: "Calm", position: "Facing the door, beside the table", attire: { worn: ["Blue wool coat", "Brown leather boots"], removed: [] } },
      { name: "Bea", roles: ["Station keeper"], physical: "Unhurt" }, { name: "Ivo", mood: "Calm" }],
    locations: [{ name: "Lantern Cafe", description: "A warm room beside the station.", relation: "Across from the Station" }, { name: "Station", description: "Bea is waiting here." }],
    people: [{ name: "Bea", detail: "Station keeper", context: "Returns for the departure" }], items: [{ name: "Map", detail: "Held by Ada", context: "Shows the safe path" }],
    rules: [{ name: "Bridge", detail: "Do not cross", context: "The keeper's order" }], plots: [{ name: "Meeting", detail: "Ada and Player", context: "At dusk" }],
  }) });
const fixturePast = (chat:string):StoryRow=>({id:`${chat}-past`,chat_id:chat,index_in_chat:0,swipe_id:0,role:"assistant",
  content:"Bea and Player meet at the Station. Lantern Cafe is their next meeting place.<phone-state>\nloc: Station\npresent: Bea; Player\nc: Bea | roles=Station keeper | phys=Unhurt\np: Lantern Cafe | Meeting place | East of Station\n</phone-state>"});
function start() { cleanup = setup(ctx as never); }
const api = {
  async seed(kind: "empty" | "story" = "story") {
    cleanup?.(); helper.cancelAll(); docs.clear(); histories.clear(); events.clear(); readFiles.clear(); prefs = defaultPreferences(); activeChat = "a"; granted = ["chats", "chat_mutation", "interceptor", "ui_panels","generation"]; updateDelay = 0;
    helperCalls.length=0;helperDelay=0;helperOutput='{"weather":"Clear skies"}';helperProfiles=[{id:"small",name:"Saved small connection",model:"Small test model"}];
    composerState = { mounted:true, chatId:"a", text:"" }; focusCount = 0; sendCalls = 0; ctx.host.capabilities["composer-v1"] = 1;
    failAppearanceSave = false; failWidget = false;
    if (new URL(location.href).searchParams.has("stale-appearance")) prefs = { ...defaultPreferences(), css: ".lpt-root { display: none !important; }" };
    if (kind === "story") { histories.set("a", [fixturePast("a"),fixtureRow("a")]); histories.set("b", [fixturePast("b"),fixtureRow("b")]); }
    start();
  },
  reload() { cleanup?.(); start(); },
  switchChat(chat: string | null) { activeChat = chat; composerState = { mounted: !!chat, chatId:chat, text:"" }; events.get("CHAT_SWITCHED")?.forEach(fn => fn({ chatId: chat })); },
  incoming(from: string, text: string, time?: string) {
    const chat = activeChat!; const rows = histories.get(chat) ?? [];
    rows.push({ id:`${chat}-${rows.length}`, chat_id:chat, index_in_chat:rows.length, role:"assistant", swipe_id:0, content:`A text arrives.<phone-text from="${from}"${time ? ` time="${time}"` : ""}>${text}</phone-text>` });
    histories.set(chat,rows); events.get("MESSAGE_SENT")?.forEach(fn => fn({ chatId:chat }));
  },
  sendComposer() {
    const chat = activeChat!; const rows = histories.get(chat) ?? [];
    rows.push({ id:`${chat}-${rows.length}`, chat_id:chat, index_in_chat:rows.length, role:"user", name:"Player", swipe_id:0, content:composerState.text });
    histories.set(chat,rows); composerState.text = ""; events.get("MESSAGE_SENT")?.forEach(fn => fn({ chatId:chat }));
  },
  composer: () => ({ ...composerState, focusCount, sendCalls }),
  setComposer(state: Partial<typeof composerState>) { composerState = { ...composerState, ...state }; },
  composerSupported(value: boolean) { ctx.host.capabilities["composer-v1"] = value ? 1 : 0; },
  generationEvent(name:string,id:string){for(const fn of events.get(name)??[])fn({chatId:activeChat,generationId:id});},
  helperCalls:()=>helperCalls.length,
  helperDelay(ms:number){helperDelay=ms;},
  helperOutput(value:string){helperOutput=value;},
  removeHelperConnection(){helperProfiles=[];},
  helperStart(id:string){helper.started(activeChat!,id);onBackend({type:"phone_helper_changed",chatId:activeChat});},
  helperEnd(id:string,content:string){const chat=activeChat!;const rows=histories.get(chat)??[];const row:StoryRow={id:`${chat}-${rows.length}`,chat_id:chat,index_in_chat:rows.length,role:"assistant",swipe_id:0,content};rows.push(row);histories.set(chat,rows);helper.ended(`owner-${chat}`,{chatId:chat,generationId:id,messageId:row.id,content});onBackend({type:"phone_helper_changed",chatId:chat});},
  updateDelay(ms: number) { updateDelay = ms; },
  getPreferences: () => structuredClone(prefs),
  failAppearanceSave(value: boolean) { failAppearanceSave = value; },
  failWidget(value: boolean) { failWidget = value; },
  setCSS(css: string) { prefs = { ...defaultPreferences(), css }; },
  activityStory(content:string,role:"assistant"|"user"="assistant",name?:string){const chat=activeChat!,rows=histories.get(chat)??[];rows.push({id:`${chat}-${rows.length}`,chat_id:chat,index_in_chat:rows.length,role,swipe_id:0,content,...(name?{name}:{})});histories.set(chat,rows);events.get("MESSAGE_SENT")?.forEach(fn=>fn({chatId:chat}));},
  getDocument: (chat = "a") => JSON.parse(docs.get(chat) ?? "null"),
  emitTag(tag: string, streaming: boolean, user: boolean) { for (const item of tagHandlers) if ((item.options as { tagName: string }).tagName === tag) item.callback({ chatId: activeChat, messageId: `${activeChat}-0`, isUser: user, isStreaming: streaming }); },
  tagHandlers: () => tagHandlers.map(h => h.options), tagCalls: () => tagCalls,
};
(window as unknown as { harness: typeof api }).harness = api;
void api.seed();

import type { SpindleFrontendContext } from "lumiverse-spindle-types";
import type { Document as PhoneDocument } from "./model";
import { EXTENSION_NAME, isRecord, TEXT_TAG, TRACKER_TAG } from "./shared";
import { PhoneView } from "./phone-view";
import { defaultPreferences, readPreferences, type Preferences } from "./preferences";
import css from "./styles.css" with { type: "text" };
import { addReplyDraft, emptyReads, type ReadState } from "./messages";
import { readState } from "./message-reads";
import type { ConnectionsInfo } from "./helper";
import { HelperFailure, readRefreshResult } from "./helper-status";

export function setup(ctx: SpindleFrontendContext): () => void {
  const disposers: (() => void)[] = [];
  let disposed = false;
  let activeChat: string | null = null;
  let epoch = 0;
  let pendingSync = "";
  let current: PhoneDocument | null = null;
  let reads = emptyReads();
  let preferences = defaultPreferences();
  let view: PhoneView | null = null;
  let widget: ReturnType<SpindleFrontendContext["ui"]["createFloatWidget"]> | null = null;
  let lastSize = "";
  let widgetLoad: Promise<void> | null = null;
  let widgetResize: ResizeObserver | null = null;
  let widgetWasConnected = false;
  let openRequested = false;
  let appearanceEpoch = 0;
  const updates = new Map<string, { chatId: string; epoch: number; resolve: (doc: PhoneDocument) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const prefsRequests = new Map<string, { appearanceEpoch: number; resolve: (prefs: Preferences) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const readRequests = new Map<string, { chatId: string; epoch: number; resolve: (reads: ReadState) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const streaming=new Map<string,Set<string>>();
  let backendBusy=false;
  const busy=()=>backendBusy||!!(activeChat&&streaming.get(activeChat)?.size);
  const helperRequests = new Map<string, { chatId:string; epoch:number; resolve:(value:unknown)=>void; reject:(error:Error)=>void; timer:ReturnType<typeof setTimeout> }>();
  const removeHostStyle = ctx.dom.addStyle(css);
  disposers.push(removeHostStyle);

  const sendSync = () => {
    pendingSync = crypto.randomUUID();
    ctx.sendToBackend({ type: "phone_sync", requestId: pendingSync, ...(activeChat ? { chatId: activeChat } : {}) });
  };
  // These attach before any asynchronous UI initialization or DOM work.
  for (const tagName of [TRACKER_TAG, TEXT_TAG]) disposers.push(ctx.messages.registerTagInterceptor({ tagName, removeFromMessage: true }, payload => {
    if (disposed || payload.isStreaming !== false || !payload.chatId || !payload.messageId || payload.chatId !== activeChat) return;
    if (payload.isUser === false || (tagName === TEXT_TAG && payload.isUser === true)) sendSync();
  }));

  const prefsChange = (change?: { css?: string; dismiss?: import("./preferences").App }): Promise<Preferences> => {
    const requestId = crypto.randomUUID();
    if (change?.css !== undefined) { appearanceEpoch++; preferences = { ...preferences, css: change.css }; }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { prefsRequests.delete(requestId); reject(new Error("Appearance could not be saved. Try again.")); }, 15000);
      prefsRequests.set(requestId, { appearanceEpoch, resolve, reject, timer });
      ctx.sendToBackend({ type: change ? "phone_preferences_update" : "phone_preferences", requestId, ...(change ? { change } : {}) });
    });
  };
  const update = (change: Parameters<PhoneViewActionsUpdate>[0], revision: number): Promise<PhoneDocument> => {
    if (!activeChat || !current) return Promise.reject(new Error("Open a chat first."));
    const requestId = crypto.randomUUID(); const chatId = activeChat; const originEpoch = epoch;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { updates.delete(requestId); reject(new Error("Saving took too long. Reopen this chat and check before trying again.")); }, 15000);
      updates.set(requestId, { chatId, epoch: originEpoch, resolve, reject, timer });
      ctx.sendToBackend({ type: "phone_update", requestId, chatId, revision, ...change });
    });
  };
  const markRead: import("./phone-view").ViewActions["markRead"] = (chatId, key, observed) => {
    if (disposed || chatId !== activeChat) return Promise.reject(new Error("The chat changed."));
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { readRequests.delete(requestId); reject(new Error("Read status could not be saved.")); }, 15000);
      readRequests.set(requestId, { chatId, epoch, resolve, reject, timer });
      ctx.sendToBackend({ type: "phone_mark_read", requestId, chatId, key, observed });
    });
  };
  const requestHelper = (type:"phone_connections"|"phone_helper_now"):Promise<unknown> => {
    if(!activeChat||disposed)return Promise.reject(new Error("Open a chat first."));
    if(type==="phone_helper_now" && busy())return Promise.reject(new HelperFailure("validation rejected"));
    const chatId=activeChat,requestId=crypto.randomUUID();
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{helperRequests.delete(requestId);reject(new HelperFailure("timeout"));},type==="phone_helper_now"?105000:15000);
      helperRequests.set(requestId,{chatId,epoch,resolve,reject,timer});ctx.sendToBackend({type,chatId,requestId});
    });
  };
  const reset = () => {
    // Clear the local preference before mounting/reopening, without waiting for storage.
    const saving = prefsChange({ css: "" });
    const originalView = view;
    openRequested = true; lastSize = ""; view?.resetCSS(); view?.open();
    recoveryStatus.textContent = "Resetting…";
    void ensureWidget().then(() => { if (view !== originalView) view?.resetCSS(); view?.open(); });
    void saving.then(() => { recoveryStatus.textContent = "Appearance reset."; })
      .catch(() => { recoveryStatus.textContent = "Reset for now. Could not save; try again."; });
  };
  const tab = ctx.ui.registerDrawerTab({ id: "phone", title: EXTENSION_NAME, shortName: "Phone", headerTitle: EXTENSION_NAME,
    description: "Open your story phone or reset its appearance", keywords: ["phone", "tracker", "reset"] });
  const panel = document.createElement("section"); panel.className = "lpt-recovery-panel";
  const help = document.createElement("p"); help.className = "lpt-recovery-status"; help.textContent = "Your story phone. Appearance controls here stay usable even if custom CSS hides the phone.";
  const open = document.createElement("button"); open.className = "lpt-recovery-button"; open.type = "button"; open.textContent = "Open phone";
  open.addEventListener("click", () => { openRequested = true; void ensureWidget().then(() => { view?.open(); if (!view) help.textContent = "Allow floating panels in Extensions, then open the phone again."; }); });
  const resetButton = document.createElement("button"); resetButton.className = "lpt-recovery-button"; resetButton.type = "button"; resetButton.textContent = "Reset appearance"; resetButton.addEventListener("click", reset);
  const recoveryActions = document.createElement("div"); recoveryActions.className = "lpt-recovery-actions"; recoveryActions.append(open, resetButton);
  const recoveryStatus = document.createElement("p"); recoveryStatus.className = "lpt-recovery-status"; recoveryStatus.setAttribute("aria-live", "polite");
  panel.append(help, recoveryActions, recoveryStatus); tab.root.append(panel); disposers.push(() => tab.destroy());
  disposers.push(tab.onActivate(() => { void ensureWidget(); }));

  async function ensureWidget(): Promise<void> {
    if (disposed) return;
    if (widgetLoad) return widgetLoad;
    const task = mountWidget(); widgetLoad = task;
    try { await task; } finally { if (widgetLoad === task) widgetLoad = null; }
  }
  async function mountWidget(): Promise<void> {
    try {
      const granted = await ctx.permissions.getGranted();
      if (disposed) return;
      if (!granted.includes("ui_panels")) {
        widgetResize?.disconnect(); widgetResize = null; view?.destroy(); view = null; widget?.destroy(); widget = null;
        help.textContent = "Allow floating panels in Extensions to open the phone. Reset appearance is still available here.";
        return;
      }
      if (widget && widgetWasConnected && !widget.root.isConnected) { widgetResize?.disconnect(); view?.destroy(); view = null; widget.destroy(); widget = null; }
      if (widget && view) { lastSize = ""; view.fit(); return; }
      widget?.destroy(); widget = null;
      lastSize = "";
      widget = ctx.ui.createFloatWidget({ width: 48, height: 48, initialPosition: { x: 24, y: 110 }, chromeless: true, tooltip: "Lumi Phone Tracker", snapToEdge: true });
      const transport = document.createElement("div"); transport.className = "lpt-transport";
      const placementId = crypto.randomUUID(); transport.dataset.lptPlacement = placementId;
      const placementStyle = document.createElement("style");
      const viewport = document.createElement("div"); viewport.className = "lpt-viewport";
      const island = document.createElement("div"); island.className = "lpt-island";
      // Native browser isolation inside a documented Lumiverse widget root.
      // Custom selectors never reach the sidebar recovery controls or other host UI.
      const shadow = island.attachShadow({ mode: "open" });
      const base = document.createElement("style"); base.textContent = css;
      const custom = document.createElement("style"); shadow.append(base, custom);
      viewport.append(island); transport.append(viewport); widget.root.append(placementStyle, transport);
      view = new PhoneView(shadow, custom, { update, preferences: prefsChange, markRead,
        connections: async()=>await requestHelper("phone_connections") as ConnectionsInfo,
        updateNow: async()=>{const result=readRefreshResult(await requestHelper("phone_helper_now"));sendSync();return result;},
        draft: (chatId, to, text) => {
          if (disposed || activeChat !== chatId || current?.chatId !== chatId || !current.settings.enabled.messages) throw new Error("The chat changed. Reopen the original conversation.");
          return addReplyDraft(ctx, chatId, current.currentPlayer ?? "", to, text);
        }, size: (width, height) => {
        if (!widget || disposed) return;
        const vw = window.visualViewport?.width ?? window.innerWidth; const vh = window.visualViewport?.height ?? window.innerHeight;
        const w = Math.round(Math.max(48, Math.min(width, vw - 24)));
        const h = Math.round(Math.max(48, Math.min(height, vh - 24)));
        const size = `${w}/${h}`;
        if (lastSize !== size) {
          lastSize = size;
          // Give our own surface definite dimensions: widget.root may be auto-height.
          // Only finite measured numbers enter this scoped rule; there are no inline styles.
          placementStyle.textContent = `[data-lpt-placement="${placementId}"] { width: ${w}px; height: ${h}px; }`;
          widget.setSize(w, h);
          const pos = widget.getPosition(); widget.moveTo(Math.max(12, Math.min(pos.x, vw - w - 12)), Math.max(12, Math.min(pos.y, vh - h - 12)));
        }
      } });
      view.receivePreferences(preferences); view.receive(current, reads);
      try { view.applyCSS(preferences.css); } catch { help.textContent = "Saved custom CSS could not be applied. The default appearance is in use; Reset clears it."; }
      widgetWasConnected = widget.root.isConnected;
      widgetResize?.disconnect(); widgetResize = new ResizeObserver(() => {
        if (widget?.root.isConnected) widgetWasConnected = true;
        view?.fit();
      }); widgetResize.observe(widget.root);
      if (openRequested) view.open();
      requestAnimationFrame(() => { if (!disposed) view?.fit(); });
    } catch {
      widgetResize?.disconnect(); widgetResize = null; view?.destroy(); view = null; widget?.destroy(); widget = null;
      help.textContent = "The phone could not open. Check extension permissions and try again.";
    }
  }

  disposers.push(ctx.onBackendMessage(payload => {
    if (disposed || !isRecord(payload)) return;
    if(payload.type==="phone_helper_changed") { if(activeChat && payload.chatId===activeChat)sendSync();return; }
    if(typeof payload.requestId!=="string")return;
    const helperRequest=helperRequests.get(payload.requestId);
    if(helperRequest) {
      if(!["phone_connections_result","phone_helper_now_result","phone_helper_error"].includes(String(payload.type)))return;
      clearTimeout(helperRequest.timer);helperRequests.delete(payload.requestId);
      if(helperRequest.epoch!==epoch||helperRequest.chatId!==activeChat||payload.chatId!==activeChat){helperRequest.reject(new Error("The chat changed."));return;}
      if(payload.type==="phone_helper_error"){helperRequest.reject(new HelperFailure(readRefreshResult({ok:false,category:payload.category}).category!));return;}
      helperRequest.resolve(payload.type==="phone_helper_now_result"?payload.result:payload.info);return;
    }
    const readRequest = readRequests.get(payload.requestId);
    if (readRequest) {
      if (!["phone_reads_result", "phone_reads_error"].includes(String(payload.type))) return;
      clearTimeout(readRequest.timer); readRequests.delete(payload.requestId);
      if (readRequest.chatId !== activeChat || readRequest.epoch !== epoch || payload.chatId !== activeChat) { readRequest.reject(new Error("The chat changed.")); return; }
      try {
        if (payload.type === "phone_reads_error") throw new Error("Read status could not be saved.");
        const value = readState(payload.reads); if (value.revision >= reads.revision) reads = value;
        readRequest.resolve(reads);
      } catch { readRequest.reject(new Error("Read status could not be saved.")); }
      return;
    }
    const preferenceRequest = prefsRequests.get(payload.requestId);
    if (preferenceRequest) {
      if (!["phone_preferences_result", "phone_preferences_error"].includes(String(payload.type))) return;
      clearTimeout(preferenceRequest.timer); prefsRequests.delete(payload.requestId);
      if (payload.type === "phone_preferences_error") preferenceRequest.reject(new Error(String(payload.message)));
      else {
        try { const prefs = readPreferences(payload.preferences); if (preferenceRequest.appearanceEpoch === appearanceEpoch && prefs.revision >= preferences.revision) { preferences = prefs; view?.receivePreferences(prefs); }
          preferenceRequest.resolve(prefs);
        } catch { preferenceRequest.reject(new Error("Appearance could not be loaded.")); }
      }
      return;
    }
    const edit = updates.get(payload.requestId);
    if (edit) {
      if (!["phone_snapshot", "phone_error"].includes(String(payload.type))) return;
      clearTimeout(edit.timer); updates.delete(payload.requestId);
      if (edit.epoch !== epoch || edit.chatId !== activeChat) { edit.reject(new Error("The chat changed. Check the original chat before editing again.")); return; }
      if (payload.type === "phone_error") { edit.reject(new Error(String(payload.message))); return; }
      if (payload.chatId !== activeChat || !isRecord(payload.snapshot) || payload.snapshot.chatId !== activeChat) { edit.reject(new Error("The chat changed.")); return; }
      current = payload.snapshot as unknown as PhoneDocument;
      try { const value = readState(payload.reads); if (value.revision >= reads.revision) reads = value; } catch { /* Keep known read state. */ }
      view?.receiveReads(reads); backendBusy=payload.helperBusy===true;view?.receiveHelperBusy(busy()); edit.resolve(current); return;
    }
    if (payload.requestId !== pendingSync) return;
    if (payload.type === "phone_error") { view?.setError(String(payload.message)); return; }
    if (payload.type !== "phone_snapshot") return;
    if (activeChat && payload.chatId !== activeChat) return;
    activeChat = typeof payload.chatId === "string" ? payload.chatId : null;
    current = isRecord(payload.snapshot) && payload.snapshot.chatId === activeChat ? payload.snapshot as unknown as PhoneDocument : null;
    try { const value = readState(payload.reads); if (value.revision >= reads.revision) reads = value; } catch { /* Keep known read state. */ }
    view?.receive(current, reads); backendBusy=payload.helperBusy===true;view?.receiveHelperBusy(busy());
  }));
  const switchChat = (chatId: string | null) => {
    epoch++; backendBusy=false;pendingSync = ""; activeChat = chatId; current = null; reads = emptyReads(); view?.receive(null, reads);
    for (const [id, p] of readRequests) { clearTimeout(p.timer); p.reject(new Error("The chat changed.")); readRequests.delete(id); }
    for (const [id, p] of updates) { clearTimeout(p.timer); p.reject(new Error("The chat changed. Your original chat keeps its saved changes.")); updates.delete(id); }
    for(const [id,p]of helperRequests){clearTimeout(p.timer);p.reject(new Error("The chat changed."));helperRequests.delete(id);}
    if (chatId) sendSync();
  };
  disposers.push(ctx.events.on("CHAT_SWITCHED", (payload: unknown) => { if (isRecord(payload)) switchChat(typeof payload.chatId === "string" ? payload.chatId : null); }));
  for (const event of ["MESSAGE_SENT", "MESSAGE_EDITED", "MESSAGE_DELETED", "MESSAGE_SWIPED", "SWIPE_EDITED", "CHAT_CHANGED"]) disposers.push(ctx.events.on(event, (payload: unknown) => {
    if (isRecord(payload) && activeChat && payload.chatId === activeChat) sendSync();
  }));
  for(const name of ["GENERATION_STARTED","GENERATION_ENDED","GENERATION_STOPPED"])disposers.push(ctx.events.on(name,(payload:unknown)=>{
    if(!isRecord(payload)||typeof payload.chatId!=="string"||typeof payload.generationId!=="string")return;
    const ids=streaming.get(payload.chatId)??new Set<string>();
    if(name==="GENERATION_STARTED")ids.add(payload.generationId);else ids.delete(payload.generationId);
    if(ids.size)streaming.set(payload.chatId,ids);else streaming.delete(payload.chatId);
    if(payload.chatId===activeChat){view?.receiveHelperBusy(busy());if(name!=="GENERATION_STARTED")sendSync();}
  }));
  const fit = () => view?.fit(); window.addEventListener("resize", fit); window.visualViewport?.addEventListener("resize", fit);
  disposers.push(() => { window.removeEventListener("resize", fit); window.visualViewport?.removeEventListener("resize", fit); });
  const detected = typeof ctx.getActiveChat === "function" ? ctx.getActiveChat().chatId : ctx.composer?.getState().chatId;
  if (detected) activeChat = detected;
  sendSync();
  const initialAppearanceEpoch = appearanceEpoch;
  void prefsChange().then(p => { if (disposed || initialAppearanceEpoch !== appearanceEpoch || p.revision < preferences.revision) return; preferences = p; view?.receivePreferences(p); try { view?.applyCSS(p.css); } catch { help.textContent = "Saved custom CSS could not be applied. Reset appearance to clear it."; } }).catch(() => { help.textContent = "Appearance could not be loaded. Default styles are in use."; });
  void ensureWidget();
  return () => {
    disposed = true; epoch++; widgetResize?.disconnect(); view?.destroy(); widget?.destroy();
    for (const p of updates.values()) { clearTimeout(p.timer); p.reject(new Error("The phone closed before saving completed. Check the chat before trying again.")); }
    for (const p of prefsRequests.values()) { clearTimeout(p.timer); p.reject(new Error("The phone closed.")); }
    for (const p of readRequests.values()) { clearTimeout(p.timer); p.reject(new Error("The phone closed.")); }
    for(const p of helperRequests.values()){clearTimeout(p.timer);p.reject(new Error("The phone closed."));}
    updates.clear(); prefsRequests.clear(); readRequests.clear(); helperRequests.clear(); disposers.forEach(fn => fn());
  };
}
type PhoneViewActionsUpdate = import("./phone-view").ViewActions["update"];

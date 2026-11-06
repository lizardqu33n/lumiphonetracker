import {CONTACT_ICONS} from "./contact-icons";
import {emptyContactInfo,contactDuplicates,contactMatch} from "./contact-info";
import {renderEmojiText,attachEmojiPicker} from "./emoji";
import {preparePortrait,portraitBytes,portraitSource,portraitKey,initialTone,emptyPortraitSources,PORTRAIT_INPUT_LIMIT,type PortraitSources} from "./portraits";
import type { Cell, Contact, Document as PhoneDocument, ManualEdit, Note, Section } from "./model";
import { effectiveDocument, CONTACT_KEYS, SCENE_KEYS, SECTIONS, normalize } from "./model";
import { APP_IMAGES } from "./app-icons";
import { activityReceipt,activityUnread } from "./activity";
import { APPS, defaultPreferences, type App, type Preferences } from "./preferences";
import { prepareCustomCSS } from "./custom-css";
import { LAUNCHER_ICON } from "./launcher-icon";
import { HOME_ICONS, type IconNode } from "./icons";
import { conversations, emptyReads, isUnread, receipt, threadKey, type Conversation, type ReadState } from "./messages";
import { isRecord } from "./shared";

export interface ViewActions {
  update(change: { edit?: Partial<ManualEdit>; settings?: unknown; dismissNotice?: string;portrait?:{name:string;data:string|null};contactInfo?:unknown }, revision: number): Promise<PhoneDocument>;
  preferences(change: { css?: string; dismiss?: App|"Home"|"Draft hint" }): Promise<Preferences>;
  markRead(chatId: string, key: string, observed: { id: string; receipt: string }[]): Promise<ReadState>;
  draft(chatId: string, to: string, text: string,group?:string): { manual: boolean; tag: string };
  size(width: number, height: number, open: boolean): void;
}
export const DESCRIPTIONS: Record<App, string> = {
  Scene: "Where the story is happening right now.", Weather: "Only the weather the story has established.",
  Calls:"Calls established in the story.", Email:"Emails actually sent in the story.", Bank:"Only balances and transactions the story states.",
  Locations: "Places that matter in this story.", Notes: "People, items, rules, and plans worth remembering.",
  Contacts: "What the story has established about each character.", Messages: "Texts actually sent in the story.",
};
const FIELD_NAMES: Record<string, string> = { location: "Location", time: "Time", date: "Date", present: "Here now",
  roles: "Roles", physical: "Physical status", mood: "Mood", position: "Position", attire: "Attire", thoughts: "Inner thoughts" };
const SECTION_NAMES: Record<Section, string> = { people: "People to remember", items: "Key items", rules: "Rules", plots: "Pending plots", misc: "Misc" };
const SECTION_FIELDS: Record<Section, [string, string, string]> = {
  people: ["Name", "Role or affiliation", "Why they will return / last known status"],
  items: ["Item", "Holder or location", "Story function"], rules: ["Subject", "Explicit rule", "Source or context"],
  plots: ["What is pending", "Who is involved", "Trigger or deadline"], misc: ["Label", "Value or note", ""],
};
const CONTROL_PATHS: Record<string, string[]> = {
  Phone: ["M7 2h10v20H7Z", "M10 18h4"], Back: ["m14 5-7 7 7 7"], Close: ["m6 6 12 12M18 6 6 18"],
};
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.className = cls; if (text !== undefined) renderEmojiText(node,text); return node;
}
export function appImage(name:string):HTMLImageElement {const img=el("img","lpt-app-image");img.src=APP_IMAGES[name]??"";img.alt="";img.setAttribute("aria-hidden","true");img.draggable=false;return img;}
export function icon(name: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "lpt-icon"); svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
  const nodes: readonly IconNode[] = HOME_ICONS[name] ?? (CONTROL_PATHS[name] ?? CONTROL_PATHS.Phone).map(d => ["path", { d }] as const);
  for (const [tag, attrs] of nodes) {
    const shape = document.createElementNS("http://www.w3.org/2000/svg", tag);
    shape.setAttribute("class", "lpt-icon-path");
    for (const [key, value] of Object.entries(attrs)) shape.setAttribute(key, value);
    svg.append(shape);
  }
  return svg;
}
function button(label: string, cls: string, fn: () => void): HTMLButtonElement {
  const b = el("button", cls, label); b.type = "button"; b.addEventListener("click", fn); return b;
}
const lines = (text: string) => text.split("\n").map(s => s.trim()).filter(Boolean);
const valueText = (cell?: Cell): string => {
  if (!cell) return ""; const v = cell.value;
  return typeof v === "string" ? v : Array.isArray(v) ? v.join("\n") : "name" in v ? v.name : v.worn.join("\n");
};
const marked = (cell?: Cell) => cell?.by === "user" ? "edited by you" : cell?.inferred ? "inferred" : "";
interface FormField { key: string; label: string; value: string; multiline?: boolean; required?: boolean; max?: number; check?: boolean; number?:boolean; options?:[string,string][] }

/** Ordinary DOM renderer mounted inside the phone's isolated shadow tree. */
export class PhoneView {
  readonly root = el("div", "lpt-root");
  readonly launcher = button("", "lpt-launcher", () => this.open());
  private frame = el("section", "lpt-frame");
  private content = el("main", "lpt-content");
  private storyStrip=el("div","lpt-story-strip");
  private heading = el("h1", "lpt-heading");
  private back = button("", "lpt-back", () => this.navigate("Home"));
  private error = el("p", "lpt-error");
  private status = el("p", "lpt-status");
  private doc: PhoneDocument | null = null;
  private prefs = defaultPreferences();
  private app: App | "Home" = "Home";
  private openState = false;
  private editing = false;
  private busy = false;
  private observer: ResizeObserver;
  private portraitSources=emptyPortraitSources();
  private portraitEpoch=0;
  private pendingThreadScroll=false;
  private viewportFit=()=>this.measure();
  private selectedContact:string|null=null;
  private contactOrigin:"Contacts"|"Messages"="Contacts";
  private contactScroll=0;
  private selectedText: string | null = null;
  private probe = el("div", "lpt-size-probe");
  private reads = emptyReads();
  private pendingReads = new Set<string>();
  private chatEpoch = 0;
  private replySelections=new Map<string,{start:number;end:number}>();
  private replyDrafts = new Map<string, string>();
  private manualDrafts = new Map<string, string>();
  private textNotice = el("p", "lpt-text-notice");
  private noticeTimer: ReturnType<typeof setTimeout> | undefined;
  constructor(private mount: ShadowRoot | HTMLElement, private customStyle: HTMLStyleElement, private actions: ViewActions) {
    this.launcher.setAttribute("aria-label", "Open phone");
    const launcherImage=el("img","lpt-launcher-image");
    launcherImage.src=LAUNCHER_ICON;launcherImage.alt="";launcherImage.setAttribute("aria-hidden","true");launcherImage.draggable=false;
    this.launcher.append(launcherImage);
    this.back.setAttribute("aria-label", "Back to Home"); this.back.append(icon("Back"));
    const close = button("", "lpt-close", () => this.close()); close.setAttribute("aria-label", "Close phone"); close.append(icon("Close"));
    const header = el("header", "lpt-header"); header.append(this.back, this.heading, close);
    const speaker = el("div", "lpt-speaker"); speaker.setAttribute("aria-hidden", "true");
    this.textNotice.setAttribute("role", "status"); this.textNotice.setAttribute("aria-live", "polite"); this.textNotice.hidden = true;
    this.frame.setAttribute("aria-label", "Lumi Phone Tracker"); this.frame.append(speaker,this.storyStrip, header, this.textNotice, this.content);
    this.probe.setAttribute("aria-hidden", "true"); this.root.append(this.launcher, this.frame, this.probe); mount.append(this.root);
    this.root.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); this.close(); } });
    this.observer = new ResizeObserver(() => this.measure()); this.observer.observe(this.root); this.observer.observe(this.probe); this.observer.observe(this.launcher);
    window.visualViewport?.addEventListener("resize",this.viewportFit);
    this.render(); this.setOpen(false);
  }
  receive(doc: PhoneDocument | null, reads?: ReadState): void {
    const changedChat = doc?.chatId !== this.doc?.chatId;

    const oldActivities=new Set([...(this.doc?.state.calls??[]),...(this.doc?.state.emails??[])].map(e=>activityReceipt(e)));
    const previous = new Set(this.doc?.state.messages.filter(m => m.direction === "incoming").map(m => JSON.stringify([m.id, receipt(m)])) ?? []);
    const arrived = !changedChat && this.doc && doc?.settings.apps.Messages&&doc.settings.enabled.messages ? doc.state.messages.filter(m => m.direction === "incoming" && !previous.has(JSON.stringify([m.id, receipt(m)]))) : [];
    this.doc = doc;
    if(this.app!=="Home"&&!doc?.settings.apps[this.app])this.app="Home";
    if (changedChat) {
      this.selectedContact=null;this.contactOrigin="Contacts";this.contactScroll=0;this.portraitEpoch++;this.portraitSources=emptyPortraitSources();this.chatEpoch++; this.pendingReads.clear(); this.reads = reads ?? emptyReads(); this.replyDrafts.clear();this.replySelections.clear(); this.manualDrafts.clear();
      this.clearTextNotice(); this.editing = false; this.app = "Home"; this.selectedText = null;


    } else if (reads && reads.revision >= this.reads.revision) this.reads = reads;
    if (!doc?.settings.apps.Messages||!doc.settings.enabled.messages) this.clearTextNotice();
    else if (arrived.length) this.showTextNotice(arrived.length === 1 ? `New text from ${arrived[0].from}` : `${arrived.length} new texts`);
    if (!this.editing || changedChat) this.render(); else this.refreshBadges();
    if(!changedChat&&doc){const arrived=[...doc.state.calls.filter(c=>c.direction==="missed"&&doc.settings.apps.Calls&&doc.settings.enabled.calls),...doc.state.emails.filter(e=>e.direction==="incoming"&&doc.settings.apps.Email&&doc.settings.enabled.email)].filter(e=>!oldActivities.has(activityReceipt(e))&&activityUnread(e,this.reads.seen));if(arrived.length)this.showTextNotice(arrived.length===1?("subject" in arrived[0]?`New email from ${arrived[0].from}`:`Missed call from ${arrived[0].name}`):`${arrived.length} new calls or emails`);}
    this.markVisibleConversation();this.markVisibleActivity();
  }
  receiveReads(reads: ReadState): void { if (reads.revision >= this.reads.revision) { this.reads = reads; this.refreshBadges(); } }
  receivePreferences(prefs: Preferences): void { if (prefs.revision >= this.prefs.revision) {this.prefs=prefs;if(prefs.dismissed.includes("Draft hint"))this.root.querySelector(".lpt-draft-hint")?.remove();if(prefs.dismissed.includes(this.app))this.root.querySelector(this.app==="Home"?".lpt-home-hint":".lpt-description")?.remove();} }
  async receivePortraitSources(raw:unknown):Promise<void>{
    const epoch=++this.portraitEpoch,chat=this.chatEpoch;const sources=emptyPortraitSources();
    const prepare=async(v:unknown)=>{if(!isRecord(v)||typeof v.name!=="string"||v.name.length>100)return;try{const bytes=portraitBytes(v.data,PORTRAIT_INPUT_LIMIT);return {name:v.name,data:await preparePortrait(new Blob([bytes],{type:typeof v.data==="string"?v.data.slice(5,v.data.indexOf(";")):""}))};}catch{return;}};
    if(isRecord(raw)){if(Array.isArray(raw.characters))for(const c of raw.characters.slice(0,30)){const result=await prepare(c);if(result)sources.characters.push(result);}const persona=await prepare(raw.persona);if(persona)sources.persona=persona;}
    if(chat!==this.chatEpoch||epoch!==this.portraitEpoch)return;this.portraitSources=sources;if(!this.editing)this.render();
  }
  private portrait(name:string,player=false,group=false,custom?:Record<string,string>):HTMLElement{
    const node=el("span",`lpt-portrait lpt-portrait-tone-${initialTone(name)}`);node.setAttribute("role","img");node.setAttribute("aria-label",`Portrait for ${name}`);
    const initial=el("span","lpt-portrait-initial",Array.from(name.trim())[0]?.toLocaleUpperCase()??"?");node.append(initial);
    const source=group?undefined:portraitSource(name,custom??this.doc?.portraits??{},this.portraitSources,player);
    if(source)try{portraitBytes(source);const img=el("img","lpt-portrait-image");img.alt="";img.setAttribute("aria-hidden","true");img.draggable=false;img.addEventListener("load",()=>{initial.hidden=true;});img.addEventListener("error",()=>{img.remove();initial.hidden=false;});img.src=source;node.append(img);}catch{}
    return node;
  }
  setError(message: string): void { renderEmojiText(this.error,message); }
  setStatus(message: string): void { renderEmojiText(this.status,message); }
  fit(): void { this.measure(); }
  applyCSS(text: string): string {
    const css = prepareCustomCSS(text); this.customStyle.textContent = css;
    requestAnimationFrame(() => this.measure()); return css;
  }
  resetCSS(): void {
    this.customStyle.textContent = ""; this.prefs = { ...this.prefs, css: "" };
    this.setOpen(true); requestAnimationFrame(() => this.measure());
  }
  open(app?: App): void { if (app) this.navigate(app); this.setOpen(true); this.back.hidden ? this.frame.querySelector<HTMLElement>(".lpt-app-button, .lpt-close")?.focus() : this.back.focus(); }
  close(): void { this.setOpen(false); this.launcher.focus(); }
  destroy(): void { window.visualViewport?.removeEventListener("resize",this.viewportFit);this.portraitEpoch++;clearTimeout(this.noticeTimer); this.chatEpoch++; this.observer.disconnect(); this.root.remove(); }
  private setOpen(open: boolean): void {
    this.openState = open; this.root.dataset.open = String(open); this.frame.hidden = !open; this.launcher.hidden = open;
    if (open) this.frame.insertBefore(this.textNotice, this.content); else this.root.insertBefore(this.textNotice, this.frame);
    this.measure(); this.markVisibleConversation();this.markVisibleActivity();
  }
  private measure(): void {
    const node = this.openState || !this.textNotice.hidden ? this.probe : this.launcher;
    const computed = getComputedStyle(node);
    const width = node.offsetWidth || Number.parseFloat(computed.width);
    const height = node.offsetHeight || Number.parseFloat(computed.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    // Fractional line heights must round up so the protected viewport never clips a notice.
    const closedHeight = this.textNotice.hidden ? height : Math.max(48, Math.ceil(this.root.getBoundingClientRect().height));
    this.actions.size(Math.max(48, width), Math.max(48, this.openState ? height : closedHeight), this.openState);
  }
  private navigate(app: App | "Home"): void { if(app==="Home")this.selectedContact=null; this.app = app!=="Home"&&!this.doc?.settings.apps[app]?"Home":app; this.editing = false; this.render(); this.content.scrollTop = 0; this.markVisibleActivity(); }
  private render(): void {
    if(this.app==="Contacts"&&this.selectedContact===null&&this.content.querySelector(".lpt-contact-row"))this.contactScroll=this.content.scrollTop;
    if(this.app==="Messages"&&this.selectedText!==null&&(!this.enabled("messages")||!this.doc||( !this.doc.state.messages.some(m=>threadKey(m)===this.selectedText)&&!this.doc.state.contacts.some(c=>normalize(c.name)===this.selectedText))))this.selectedText=null;
    const previousReply=this.content.querySelector<HTMLTextAreaElement>(".lpt-reply-input"),previousThread=previousReply?.closest<HTMLElement>(".lpt-thread")?.dataset.conversation;
    if(previousReply&&previousThread!==undefined&&this.app==="Messages")this.replySelections.set(previousThread,{start:previousReply.selectionStart,end:previousReply.selectionEnd});
    const focused = this.mount instanceof ShadowRoot ? this.mount.activeElement : document.activeElement;
    const replyFocus = focused instanceof HTMLTextAreaElement && focused.classList.contains("lpt-reply-input") ? {
      key: focused.closest<HTMLElement>(".lpt-thread")?.dataset.conversation, start: focused.selectionStart, end: focused.selectionEnd,
    } : null;
    const previousList=this.content.querySelector<HTMLElement>(".lpt-text-list");const oldScroll=previousList?{key:previousList.closest<HTMLElement>(".lpt-thread")?.dataset.conversation,top:previousList.scrollTop,bottom:this.pendingThreadScroll||previousList.scrollHeight-previousList.clientHeight-previousList.scrollTop<30}:null;
    this.content.dataset.thread=String(this.app==="Messages"&&this.selectedText!==null);
    this.content.replaceChildren(); this.error.textContent = ""; this.status.textContent = "";
    this.heading.textContent = this.app === "Home" ? "" : this.app;
    this.heading.hidden=this.app==="Home";
    const scene=this.doc?.state.scene;const clock=[this.enabled("scene.time")?valueText(scene?.time):"",this.enabled("scene.date")?valueText(scene?.date):""].filter(Boolean);
    renderEmojiText(this.storyStrip,clock.join(" \u00b7 "));this.storyStrip.hidden=!clock.length;
    const header=this.frame.querySelector<HTMLElement>(".lpt-header")!;
    if(this.app==="Home")header.prepend(this.storyStrip);else this.frame.insertBefore(this.storyStrip,header);
    this.back.hidden = this.app === "Home" ||(this.app==="Contacts"&&this.selectedContact!==null)|| (this.app==="Messages"&&this.selectedText!==null);
    if (this.app === "Home") {
      const home = el("div", "lpt-home");
      for (const app of APPS.filter(a=>this.doc?.settings.apps[a])) {
        const b = button("", "lpt-app-button", () => this.navigate(app)); b.dataset.app = app;
        const image = el("span", "lpt-app-icon"); image.append(appImage(app));
        b.append(image, el("span", "lpt-app-label", app));
        if (app === "Messages") image.append(this.unreadBadge("*"));if(app==="Calls")image.append(this.unreadBadge("@calls"));if(app==="Email")image.append(this.unreadBadge("@email")); home.append(b);
      }
      this.content.append(home);
      if(this.doc&&!home.children.length)this.empty("No apps added. Add apps from the sidebar's Phone tab.");
      if(this.doc&&!this.prefs.dismissed.includes("Home")) {
        const hint=el("div","lpt-description lpt-home-hint");hint.append(el("p","lpt-description-text","Change what the phone tracks in the sidebar's Phone tab."));
        const hide=button("×","lpt-dismiss",()=>{void this.actions.preferences({dismiss:"Home"}).then(p=>{this.receivePreferences(p);hint.remove();}).catch(()=>this.setError("Could not hide the hint."));});hide.setAttribute("aria-label","Hide Home hint");hint.append(hide);this.content.append(hint);
      }
      if (!this.doc) this.content.append(el("p", "lpt-empty", "Open a chat to start keeping track of your story."));
    } else {
      if (!this.prefs.dismissed.includes(this.app)&&!(this.app==="Messages"&&this.selectedText!==null)&&!(this.app==="Contacts"&&this.selectedContact!==null)) this.description(this.app);
      if (!this.doc && true) this.empty("Open a chat first. Each chat keeps its own story information.");
      else if (this.app === "Scene") this.scene();
      else if (this.app === "Weather") this.weather();
      else if (this.app === "Contacts") this.contacts();
      else if (this.app === "Locations") this.locations();
      else if (this.app === "Notes") this.notes();
      else if (this.app === "Messages") this.messages();
      else if(["Calls","Email","Bank"].includes(this.app))this.activities(this.app as "Calls"|"Email"|"Bank");

    }
    if (this.doc) for (const text of this.doc.state.notices) {
      const notice = el("div", "lpt-notice");
      notice.append(el("span", "lpt-notice-text", text), button("Dismiss", "lpt-dismiss", () => { void this.change({ dismissNotice: text }); }));
      this.content.append(notice);
    }
    this.error.setAttribute("role", "alert"); this.status.setAttribute("aria-live", "polite"); this.content.append(this.error, this.status);
    this.refreshBadges();
    if (replyFocus) {
      const card = Array.from(this.content.querySelectorAll<HTMLElement>(".lpt-thread")).find(c => c.dataset.conversation === replyFocus.key);
      const input = card?.querySelector<HTMLTextAreaElement>(".lpt-reply-input");
      if (input) { input.focus(); input.setSelectionRange(replyFocus.start, replyFocus.end); }
    }
    this.pendingThreadScroll=this.app==="Messages"&&this.selectedText!==null&&(!oldScroll||oldScroll.key!==this.selectedText||oldScroll.bottom);
    requestAnimationFrame(() => {const list=this.content.querySelector<HTMLElement>(".lpt-text-list");if(list)list.scrollTop=oldScroll?.key===this.selectedText&&!oldScroll.bottom?oldScroll.top:list.scrollHeight;this.pendingThreadScroll=false;this.measure();});
  }
  private description(app: App): void {
    const row = el("div", "lpt-description");
    const dismiss = button("×", "lpt-dismiss", () => {
      row.remove(); void this.actions.preferences({ dismiss: app }).then(p => { this.receivePreferences(p); }).catch(() => this.setError("That explanation could not be hidden for next time."));
    });
    dismiss.setAttribute("aria-label", `Hide ${app} explanation`); row.append(el("p", "lpt-description-text", DESCRIPTIONS[app]), dismiss); this.content.append(row);
  }
  private empty(text: string, parent: HTMLElement = this.content): void { parent.append(el("p", "lpt-empty", text)); }
  private enabled(key: string): boolean { return !!this.doc&&effectiveDocument(this.doc).settings.enabled[key]===true; }
  private async change(change: Parameters<ViewActions["update"]>[0], revision = this.doc?.revision ?? -1): Promise<void> {
    if (!this.doc || this.busy) return;
    this.busy = true; this.setStatus("Saving…");
    const controls = this.root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | HTMLSelectElement>(".lpt-setting input, .lpt-helper-source, .lpt-helper-connection, .lpt-form input, .lpt-form textarea, .lpt-form select, .lpt-form button, .lpt-add, .lpt-field, .lpt-delete");
    controls.forEach(control => { control.disabled = true; });
    try {
      const doc = await this.actions.update(change, revision); this.editing = false; this.doc = doc;

      this.render();
      this.setStatus("Saved.");
    } catch (e) { this.setStatus(""); this.setError(e instanceof Error ? e.message : "Could not save. Your changes are still here."); }
    finally { this.busy = false; controls.forEach(control => { control.disabled = false; }); }
  }
  private form(parent: HTMLElement, fields: FormField[], save: (values: Record<string, string | boolean>) => Parameters<ViewActions["update"]>[0]): void {
    if (this.editing||!parent.isConnected) return;
    const originEpoch=this.chatEpoch,originChat=this.doc?.chatId;
    this.editing = true; const revision = this.doc?.revision ?? -1;
    const form = el("form", "lpt-form"); const controls = new Map<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>();
    for (const f of fields) {
      const label = el("label", "lpt-label", f.label);
      const input = f.options?el("select","lpt-input"):f.multiline ? el("textarea", "lpt-textarea") : el("input", f.check ? "lpt-toggle" : "lpt-input");
      if(input instanceof HTMLSelectElement)for(const [value,title]of f.options??[]){const o=el("option","lpt-option",title);o.value=value;input.append(o);}
      if (input instanceof HTMLInputElement) input.type = f.check ? "checkbox" : f.number?"number":"text";
      if(input instanceof HTMLInputElement && f.number){input.min="1";input.max="20";input.step="1";}
      if (f.check && input instanceof HTMLInputElement) input.checked = f.value === "true";
      else input.value = f.value;
      input.required = f.required === true;if(!(input instanceof HTMLSelectElement))input.maxLength=f.max??500;
      input.name = f.key; controls.set(f.key, input); label.append(input); form.append(label);
    }
    const actions = el("div", "lpt-actions"); const submit = el("button", "lpt-save", "Save"); submit.type = "submit";
    actions.append(submit, button("Cancel", "lpt-cancel", () => { this.editing = false; this.render(); })); form.append(actions);
    form.addEventListener("submit", e => {
      e.preventDefault();
      if(originEpoch!==this.chatEpoch||originChat!==this.doc?.chatId||!form.isConnected)return;
      const values: Record<string, string | boolean> = {};
      for (const [key, input] of controls) values[key] = input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked : input.value.trim();
      try{void this.change(save(values), revision);}catch(error){this.setError(error instanceof Error?error.message:"Check the form.");}
    });
    parent.append(form); controls.values().next().value?.focus();
  }
  private field(parent: HTMLElement, key: string, cell: Cell | undefined, target: "scene" | "weather" | "contact", contact?: Contact): void {
    const name = FIELD_NAMES[key] ?? "Weather";
    const b = button("", `lpt-field${key === "location" ? " lpt-location" : ""}`, () => {
      const value = cell?.value;
      const fields: FormField[] = key === "location" ? [
        { key: "value", label: "Exact location", value: valueText(cell), required: true, max: 100 },
        { key: "wider", label: "Wider places, one per line (only if known)", value: value && typeof value === "object" && "wider" in value ? value.wider.join("\n") : "", multiline: true },
      ] : key === "attire" ? [
        { key: "worn", label: "Currently worn — one item per line", value: value && typeof value === "object" && "worn" in value ? value.worn.join("\n") : "", multiline: true, max: 4000 },
        { key: "removed", label: "Recently removed — one item per line", value: value && typeof value === "object" && "removed" in value ? value.removed.join("\n") : "", multiline: true, max: 4000 },
      ] : [{ key: "value", label: `${name}${["present", "roles"].includes(key) ? " — one name or role per line" : ""}`, value: valueText(cell), multiline: ["present", "roles", "position", "physical"].includes(key), max: ["present", "roles"].includes(key) ? 4000 : 500 }];
      this.form(parent, fields, values => {
        const value = key === "location" ? { name: values.value, wider: lines(String(values.wider)) } : key === "attire" ? { worn: lines(String(values.worn)), removed: lines(String(values.removed)) } : ["present", "roles"].includes(key) ? lines(String(values.value)) : values.value;
        return { edit: { target, ...(contact ? { name: contact.name, value: { [key]: value } } : { field: key, value }) } };
      });
    });
    b.setAttribute("aria-label", `Edit ${name}${contact ? ` for ${contact.name}` : ""}`);
    b.append(el("span", "lpt-field-label", name));
    if (key === "present" && Array.isArray(cell?.value)) {
      const list = el("ul", "lpt-present-list"); for (const name of cell.value) list.append(el("li", "lpt-present-name", name));
      if (cell.value.length) b.append(list); else b.append(el("span", "lpt-field-value", "No one listed."));
    } else {
      let text = valueText(cell) || "Not established yet. Tap to add.";
      if (key === "roles" && Array.isArray(cell?.value)) text = cell.value.join(" / ") || "No roles listed.";
      b.append(el("span", "lpt-field-value", text));
      const v = cell?.value;
      if (key === "location" && v && typeof v === "object" && "wider" in v && v.wider.length) b.append(el("span", "lpt-wider", v.wider.join(" · ")));
      if (key === "attire" && v && typeof v === "object" && "removed" in v) b.append(el("span", "lpt-wider", `Removed: ${v.removed.join(" / ") || "none listed"}`));
    }
    if (marked(cell)) b.append(el("span", "lpt-marker", marked(cell))); parent.append(b);
  }
  private scene(): void {
    const section = el("section", "lpt-scene");
    if(this.enabled("scene.location"))this.field(section,"location",this.doc!.state.scene.location,"scene");
    const when=el("div","lpt-scene-when");for(const key of ["time","date"] as const)if(this.enabled(`scene.${key}`))this.field(when,key,this.doc!.state.scene[key],"scene");if(when.children.length)section.append(when);
    if(this.enabled("scene.present"))this.field(section,"present",this.doc!.state.scene.present,"scene");
    if (!section.children.length) this.empty("Scene fields are off. Turn them on in the sidebar's Phone tab.", section);
    this.content.append(section);
  }
  private weather(): void {
    const section = el("section", "lpt-weather");
    if (this.enabled("weather")) this.field(section, "weather", this.doc!.state.weather, "weather");
    else this.empty("Weather is off. Turn it on in the sidebar's Phone tab.", section);
    this.content.append(section);
  }
  private deleteAction(parent: HTMLElement, edit: Partial<ManualEdit>): void {
    const origin=this.chatEpoch;
    const b = button("Delete", "lpt-delete", () => {
      if(origin!==this.chatEpoch||!parent.isConnected)return;
      const row = el("div", "lpt-actions"); row.append(el("span", "lpt-help", "Delete this entry?"),
        button("Delete", "lpt-delete", () => { if(origin===this.chatEpoch)void this.change({ edit: { ...edit, remove: true } }); }),
        button("Cancel", "lpt-cancel", () => row.remove())); b.replaceWith(row);
    }); parent.append(b);
  }
  private contactIcon(key:keyof typeof CONTACT_ICONS):HTMLImageElement {const img=el("img","lpt-contact-action-icon");img.src=CONTACT_ICONS[key];img.alt="";img.setAttribute("aria-hidden","true");img.draggable=false;return img;}
  private openContact(name:string,origin:"Contacts"|"Messages"="Contacts"):void {if(origin==="Contacts")this.contactScroll=this.content.scrollTop;this.selectedContact=normalize(name);this.contactOrigin=origin;this.navigate("Contacts");}
  private contacts(): void {
    const section=el("section","lpt-contacts");this.content.append(section);
    const c=this.doc!.state.contacts.find(c=>normalize(c.name)===this.selectedContact);
    if(c){this.contactPage(section,c);return;}this.selectedContact=null;
    const heading=el("header","lpt-contact-list-header");heading.append(el("h2","lpt-contact-list-title","Contacts"));const add=button("+","lpt-add lpt-contact-add",()=>this.contactForm(section));add.setAttribute("aria-label","Add contact");heading.append(add);section.append(heading);
    const sorted=[...this.doc!.state.contacts].sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:"base"}));let letter="";
    for(const c of sorted){const next=Array.from(c.name.trim())[0]?.toLocaleUpperCase()??"#";if(next!==letter){letter=next;section.append(el("h3","lpt-contact-letter",letter));}const info=c.info??emptyContactInfo(c.name);const row=button("",`lpt-card lpt-contact lpt-contact-row ${info.kind==="Main"?"is-main":"is-npc"}`,()=>this.openContact(c.name));row.append(this.portrait(c.name,c.player));const words=el("span","lpt-contact-copy");words.append(el("span","lpt-card-title",c.name));const roles=c.fields.roles?.value;words.append(el("span","lpt-card-subtitle",[info.kind,...(Array.isArray(roles)&&this.enabled("contacts.roles")?roles:[])].join(" / ")));if(c.player)words.append(el("span","lpt-marker","You"));row.append(words);section.append(row);}
    if(!sorted.length){section.classList.add("is-empty");this.empty("No contacts yet. Add a contact or let the story establish one.",section);}
    requestAnimationFrame(()=>{if(this.app==="Contacts"&&this.selectedContact===null)this.content.scrollTop=this.contactScroll;});
  }
  private contactPage(parent:HTMLElement,c:Contact):void {
    const info=c.info??emptyContactInfo(c.name),page=el("section",`lpt-card lpt-contact-page is-open ${info.kind==="Main"?"is-main":"is-npc"}`);parent.append(page);
    const nav=el("header","lpt-contact-nav"),back=button("Back","lpt-button lpt-contact-back",()=>{this.selectedContact=null;this.editing=false;if(this.contactOrigin==="Messages")this.navigate("Messages");else this.render();});back.setAttribute("aria-label",this.contactOrigin==="Messages"?"Back to Messages":"Back to Contacts");nav.append(back,button("Edit","lpt-button lpt-contact-edit",()=>this.contactForm(page,c)));page.append(nav);
    const hero=el("div","lpt-contact-hero");hero.append(this.portrait(c.name,c.player),el("h2","lpt-contact-name lpt-card-title",c.name));const chips=el("div","lpt-contact-chips");for(const role of [info.kind,...(Array.isArray(c.fields.roles?.value)&&this.enabled("contacts.roles")?c.fields.roles.value:[])])chips.append(el("span","lpt-contact-chip",role));hero.append(chips);if(c.player)hero.append(el("span","lpt-marker","You"));if(c.editedByUser)hero.append(el("span","lpt-marker","edited by you"));page.append(hero);
    if(c.matchHint)page.append(el("p","lpt-contact-match-hint",c.matchHint));if(contactDuplicates(this.doc!.contactInfo??{}))page.append(el("p","lpt-contact-duplicate-warning","Duplicate phone number or email address. Matching will not choose between them."));
    const line=(label:string,value:string,action?:()=>void,image?:keyof typeof CONTACT_ICONS)=>{if(!value)return;const field=label==="Phone"?"phone":label==="Email"?"email":label==="Relationship type"?"relationship":"detail";const row=el("div",`lpt-contact-info-row lpt-contact-${field}-row`);row.append(el("span","lpt-contact-info-label",label),el("span","lpt-contact-info-value",value));if(action){const b=button(label==="Phone"?"Message":"Email","lpt-button lpt-contact-link",action);if(image)b.prepend(this.contactIcon(image));row.append(b);}page.append(row);};
    if(this.doc!.settings.apps.Messages)line("Phone",info.phone,()=>{this.selectedContact=null;this.selectedText=normalize(c.name);this.navigate("Messages");this.markVisibleConversation();},"message");
    if(this.doc!.settings.apps.Email)line("Email",info.email,()=>{this.selectedContact=null;this.navigate("Email");},"email");
    line("Relationship type",info.relationship);for(const d of info.details)line(d.label,d.value);
    const extra=el("div","lpt-contact-extra");for(const key of CONTACT_KEYS)if(key!=="roles"&&this.enabled(`contacts.${key}`)&&c.fields[key]&&(!c.player||["physical","position","attire"].includes(key))){const row=el("div","lpt-contact-info-row");row.append(el("span","lpt-contact-info-label",FIELD_NAMES[key]),el("span","lpt-contact-info-value",valueText(c.fields[key])));extra.append(row);}page.append(extra);
    if(this.doc!.settings.apps.Messages&&!info.phone){const b=button("Message","lpt-button lpt-contact-link",()=>{this.selectedContact=null;this.selectedText=normalize(c.name);this.navigate("Messages");this.markVisibleConversation();});b.prepend(this.contactIcon("message"));page.append(b);}
  }
  private contactForm(parent:HTMLElement,contact?:Contact):void {
    if(this.editing)return;
    if(!contact&&this.doc!.state.contacts.length>=30){this.setError("Contacts is full (30/30). Delete a contact to make room.");return;}
    let pendingPortrait:string|null|undefined;
    const info=contact?.info??emptyContactInfo(contact?.name??"");let kindTouched=false;const details=info.details.map(d=>({...d}));
    const fields:FormField[]=[{key:"name",label:"Name",value:contact?.name??"",required:true,max:100},{key:"kind",label:"Tag",value:info.kind,options:[["Main","Main"],["NPC","NPC"]]},
    ...(this.doc!.settings.apps.Messages?[{key:"phone",label:"Phone",value:info.phone,max:100}]:[]),...(this.doc!.settings.apps.Email?[{key:"email",label:"Email",value:info.email,max:150}]:[]),{key:"relationship",label:"Relationship type",value:info.relationship,max:100},
    ...CONTACT_KEYS.filter(k=>k!=="attire"&&(!contact?.player||["physical","position"].includes(k))).map(k=>({key:k,label:k==="roles"?"Roles (free labels, for example occupation or affiliation)":FIELD_NAMES[k],value:valueText(contact?.fields[k]),multiline:k==="roles",max:500})),{key:"worn",label:"Worn items (one per line)",value:contact?.fields.attire&&typeof contact.fields.attire.value==="object"&&"worn" in contact.fields.attire.value?contact.fields.attire.value.worn.join("\n"):"",multiline:true},{key:"removed",label:"Removed items (one per line)",value:contact?.fields.attire&&typeof contact.fields.attire.value==="object"&&"removed" in contact.fields.attire.value?contact.fields.attire.value.removed.join("\n"):"",multiline:true}];
    this.form(parent,fields,v=>{if(details.some(d=>!!d.label.trim()!==!!d.value.trim()))throw Error("Give each detail a label and a value, or remove it.");const name=String(v.name),value:Record<string,unknown>={};for(const key of CONTACT_KEYS)if(v[key]&&String(v[key])!==valueText(contact?.fields[key]))value[key]=key==="roles"?String(v[key]).split(/\n|; /).filter(Boolean):String(v[key]);const attire=contact?.fields.attire?.value,oldWorn=attire&&typeof attire==="object"&&"worn" in attire?attire.worn:[],oldRemoved=attire&&typeof attire==="object"&&"removed" in attire?attire.removed:[];const worn=lines(String(v.worn)),removed=lines(String(v.removed));if(JSON.stringify([worn,removed])!==JSON.stringify([oldWorn,oldRemoved]))value.attire={worn,removed};this.selectedContact=normalize(name);return {
      edit:{target:"contact" as const,name:contact?.name??name,...(contact&&name!==contact.name?{rename:name}:{}),value},
      contactInfo:{name,...(v.phone!==undefined?{phone:String(v.phone)}:{}),...(v.email!==undefined?{email:String(v.email)}:{}),relationship:String(v.relationship),details:details.filter(d=>d.label.trim()&&d.value.trim()),...(kindTouched?{kind:String(v.kind)}:{})},
      ...(contact&&pendingPortrait!==undefined?{portrait:{name:contact.name,data:pendingPortrait}}:{}),
    };});
    const editForm=parent.querySelector<HTMLFormElement>(".lpt-form");if(!editForm)return;
    for(const input of Array.from(editForm.querySelectorAll<HTMLInputElement>("[name]"))){input.classList.add("lpt-contact-input",`lpt-contact-input-${input.name}`);input.closest("label")?.classList.add("lpt-contact-edit-field",`lpt-contact-edit-${input.name}`);}
    editForm.querySelector('[name="kind"]')?.addEventListener("change",()=>kindTouched=true);
    const detailBox=el("div","lpt-contact-detail-editor");const detailRow=(d:{label:string;value:string})=>{const row=el("div","lpt-contact-detail-edit-row"),label=el("input","lpt-input lpt-contact-detail-label"),value=el("input","lpt-input lpt-contact-detail-value");label.value=d.label;value.value=d.value;label.maxLength=40;value.maxLength=200;label.setAttribute("aria-label","Detail label");value.setAttribute("aria-label","Detail value");label.placeholder="Label";value.placeholder="Value";label.addEventListener("input",()=>d.label=label.value);value.addEventListener("input",()=>d.value=value.value);row.append(label,value,button("Remove","lpt-button lpt-contact-detail-remove",()=>{details.splice(details.indexOf(d),1);row.remove();}));detailBox.append(row);};for(const d of details)detailRow(d);
    const addDetail=button("Add detail","lpt-button lpt-contact-detail-add",()=>{if(details.length>=12){this.setError("Keep up to 12 details per contact.");return;}const d={label:"",value:""};details.push(d);detailRow(d);});addDetail.prepend(this.contactIcon("addDetail"));editForm.append(detailBox,addDetail);
    for(const label of Array.from(editForm.querySelectorAll(".lpt-label"))){const input=label.querySelector<HTMLInputElement|HTMLTextAreaElement>("input,textarea");if(input){label.classList.toggle("is-empty",!input.value);input.addEventListener("input",()=>label.classList.toggle("is-empty",!input.value));}}
    if(contact)this.deleteAction(editForm,{target:"contact",name:contact.name});
    if(!contact)return;
    const form=parent.querySelector<HTMLFormElement>(".lpt-form");if(!form)return;
    const epoch=this.chatEpoch,name=contact.name,key=portraitKey(name);
    const controls=el("div","lpt-portrait-controls"),file=el("input","lpt-portrait-file");
    file.type="file";file.accept="image/png,image/jpeg,image/webp";file.hidden=true;file.setAttribute("aria-label","Choose portrait");
    let preview=this.portrait(name,contact.player);
    const notice=el("small","lpt-portrait-status");notice.setAttribute("aria-live","polite");
    const refreshPreview=()=>{const custom={...this.doc?.portraits};if(pendingPortrait===null)delete custom[key];else if(pendingPortrait)custom[key]=pendingPortrait;const next=this.portrait(name,contact.player,false,custom);preview.replaceWith(next);preview=next;};
    const remove=button("Remove","lpt-button lpt-remove-portrait",()=>{if(epoch!==this.chatEpoch)return;pendingPortrait=null;refreshPreview();remove.disabled=true;notice.textContent="Save to remove the custom portrait.";});
    remove.disabled=!this.doc?.portraits?.[key];
    const choose=button("Change portrait","lpt-button lpt-change-portrait",()=>file.click());
    file.addEventListener("change",()=>{
      const image=file.files?.[0];if(!image)return;choose.disabled=true;
      void preparePortrait(image).then(data=>{if(epoch!==this.chatEpoch||!form.isConnected)return;pendingPortrait=data;refreshPreview();remove.disabled=false;notice.textContent="Portrait ready. Save to apply.";})
        .catch(e=>{if(epoch===this.chatEpoch)this.setError(e instanceof Error?e.message:"Portrait could not be prepared.");})
        .finally(()=>{choose.disabled=false;file.value="";});
    });
    controls.append(preview,choose,file,remove,notice);form.append(controls);
  }
  private locations(): void {
    const section = el("section", "lpt-locations"); this.content.append(section);
    if (!this.enabled("locations")) { this.empty("Locations is off. Turn it on in the sidebar's Phone tab.", section); return; }
    section.append(button("+ Add place", "lpt-add", () => this.locationForm(section)));
    const current = this.doc!.state.scene.location?.value; const currentName = current && typeof current === "object" && "name" in current ? current.name : "";
    const places = this.doc!.state.locations;
    for (const place of places) {
      const card = el("details", "lpt-card lpt-place"); const summary = el("summary", "lpt-summary"); summary.append(el("span", "lpt-card-title", place.name));
      if (this.enabled("scene.location") && normalize(place.name) === normalize(currentName)) summary.append(el("span", "lpt-marker", "Current"));
      if (place.by === "user") summary.append(el("span", "lpt-marker", "edited by you"));
      const body = el("div", "lpt-card-body"); body.append(el("p", "lpt-place-description", place.description || "No description established yet."));
      if (place.relation) body.append(el("p", "lpt-help", place.relation));
      const actions = el("div", "lpt-actions"); actions.append(button("Edit", "lpt-button", () => this.locationForm(body, place)));
      this.deleteAction(actions, { target: "location", name: place.name }); body.append(actions); card.append(summary, body); section.append(card);
    }
    if (!places.length) this.empty("No places yet. This fills in when the story establishes a meaningful place.", section);
  }
  private locationForm(parent: HTMLElement, place?: PhoneDocument["state"]["locations"][number]): void {
    if (!place && this.doc!.state.locations.length >= 30) { this.setError("Locations is full (30/30). Delete a place to make room."); return; }
    this.form(parent, [
      { key: "name", label: "Place name", value: place?.name ?? "", required: true, max: 100 },
      { key: "description", label: "Short description", value: place?.description ?? "", multiline: true },
      { key: "relation", label: "How it relates to another place (optional)", value: place?.relation ?? "" },
    ], v => ({ edit: { target: "location", name: place?.name ?? String(v.name), ...(place && v.name !== place.name ? { rename: String(v.name) } : {}), value: { description: v.description, relation: v.relation } } }));
  }
  private notes(): void {
    const section = el("section", "lpt-notes"); this.content.append(section); let shown = false;
    for (const key of SECTIONS) {
      if (!this.enabled(`notes.${key}`)) continue; shown = true;
      const group = el("details", "lpt-section lpt-note-section"); group.dataset.section = key;
      const summary = el("summary", "lpt-summary lpt-section-header");
      const count = this.doc!.state.notes[key].filter(n => !n.resolved).length;
      summary.append(el("span", "lpt-section-title", SECTION_NAMES[key]), el("span", "lpt-counter", `${count}/${this.doc!.settings.notesPerSection}`));
      const add = button("+ Add", "lpt-add", () => { group.open = true; this.noteForm(body, key); });
      add.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); }); summary.append(add);
      const body = el("div", "lpt-section-body"); group.append(summary, body);
      const notes = this.doc!.state.notes[key];
      for (const note of notes.filter(n => !n.resolved)) this.noteCard(body, key, note);
      if (!notes.filter(n => !n.resolved).length) this.empty(`No ${SECTION_NAMES[key].toLocaleLowerCase()} yet. Add one, or let the story establish it.`, body);
      const resolved = notes.filter(n => n.resolved);
      if (resolved.length) {
        const old = el("details", "lpt-resolved"); old.append(el("summary", "lpt-summary", `Resolved (${resolved.length})`));
        for (const note of resolved) this.noteCard(old, key, note); body.append(old);
      }
      section.append(group);
    }
    if (!shown) this.empty("All Notes sections are off. Turn one on in the sidebar's Phone tab.", section);
  }
  private noteCard(parent: HTMLElement, key: Section, note: Note): void {
    const card = el("details", "lpt-card lpt-note"); const summary = el("summary", "lpt-summary");
    summary.append(el("span", "lpt-note-line", [note.name, note.detail, note.context].filter(Boolean).join(" | ")));
    if (note.addedByUser) summary.append(el("span", "lpt-marker", "added by you"));
    if (note.by === "user" && (!note.addedByUser || note.updated)) summary.append(el("span", "lpt-marker", "edited by you"));
    if (note.updated) summary.append(el("span", "lpt-marker", "Updated"));
    const body = el("div", "lpt-card-body");
    body.append(el("p", "lpt-note-full", [note.name, note.detail, note.context].filter(Boolean).join(" | ")));
    const actions = el("div", "lpt-actions"); actions.append(button("Edit", "lpt-button", () => this.noteForm(body, key, note)));
    this.deleteAction(actions, { target: "note", section: key, name: note.name }); body.append(actions); card.append(summary, body); parent.append(card);
  }
  private noteForm(parent: HTMLElement, key: Section, note?: Note): void {
    if (!note && this.doc!.state.notes[key].filter(n => !n.resolved).length >= this.doc!.settings.notesPerSection) { this.setError("This section is full. Delete a note to make room."); return; }
    const labels = SECTION_FIELDS[key]; const fields: FormField[] = [
      { key: "name", label: labels[0], value: note?.name ?? "", required: true, max: 100 },
      { key: "detail", label: labels[1], value: note?.detail ?? "", multiline: true, max: 240 },
    ];
    if (labels[2]) fields.push({ key: "context", label: labels[2], value: note?.context ?? "", max: 240 });
    if (key === "plots") fields.push({ key: "resolved", label: "Resolved", value: String(note?.resolved ?? false), check: true });
    if (key === "misc") fields.push({ key: "sendToAI", label: "Send to AI", value: String(note?.sendToAI ?? false), check: true });
    this.form(parent, fields, v => ({ edit: { target: "note", section: key, name: note?.name ?? String(v.name),
      ...(note && v.name !== note.name ? { rename: String(v.name) } : {}), value: { detail: v.detail, context: v.context ?? "",
        ...(key === "plots" ? { resolved: v.resolved } : {}), ...(key === "misc" ? { sendToAI: v.sendToAI } : {}) } } }));
  }
  private messages():void{
    const section=el("section","lpt-messages");this.content.append(section);
    if(!this.enabled("messages")){this.selectedText=null;this.content.dataset.thread="false";this.empty("Messages is off. Turn it on in the sidebar's Phone tab.",section);return;}
    const threads=conversations(this.doc!.state.messages,this.reads);
    if(this.selectedText!==null&&!threads.some(t=>t.key===this.selectedText)){const c=this.doc!.state.contacts.find(c=>normalize(c.name)===this.selectedText);if(c)threads.push({key:normalize(c.name),name:c.name,messages:[],unread:0});else this.selectedText=null;}
    const selected=threads.find(t=>t.key===this.selectedText);
    if(selected){this.conversation(section,selected);return;}
    this.content.dataset.thread="false";if(!threads.length)this.empty("No texts yet. Actual texts sent to you will appear here.",section);
    const list=el("div","lpt-conversations");for(const thread of threads){const row=button("","lpt-conversation lpt-thread-row",()=>{this.selectedText=thread.key;this.render();this.markVisibleConversation();this.content.querySelector<HTMLElement>(".lpt-thread-back")?.focus();});row.dataset.conversation=thread.key;const last=thread.messages.at(-1),copy=el("span","lpt-thread-copy");copy.append(el("span","lpt-card-title",thread.name),el("span","lpt-thread-preview",last?`${last.direction==="outgoing"?"You: ":""}${last.text.replace(/\s+/g," ")}`:"No texts yet"));row.append(this.portrait(thread.name,this.doc!.state.contacts.some(c=>c.player&&normalize(c.name)===normalize(thread.name)),thread.group),copy);if(last?.time)row.append(el("small","lpt-thread-time",last.time));row.append(this.unreadBadge(thread.key));list.append(row);}section.append(list);
  }
  private conversation(parent:HTMLElement,thread:Conversation):void{
    const chatId=this.doc!.chatId,epoch=this.chatEpoch;const card=el("div","lpt-thread");card.dataset.conversation=thread.key;const header=el("header","lpt-thread-header");
    const back=button("Back","lpt-button lpt-thread-back",()=>{this.selectedText=null;this.render();});back.setAttribute("aria-label","Back to Messages");header.append(back,this.portrait(thread.name,false,thread.group),el("h2","lpt-thread-name",thread.name));if(!thread.group){const c=this.doc!.state.contacts.find(c=>normalize(c.name)===thread.key);if(c){const link=button("Contact","lpt-button lpt-thread-contact",()=>this.openContact(c.name,"Messages"));header.append(link);}}card.append(header);
    const list=el("div","lpt-text-list");list.setAttribute("role","log");list.setAttribute("aria-label",`Texts with ${thread.name}`);let sender="",direction="",day:string|undefined;
    const group=thread.group===true||new Set(thread.messages.filter(m=>m.direction==="incoming").map(m=>normalize(m.from))).size>1;
    for(const message of thread.messages){if(this.enabled("scene.date")&&message.date&&message.date!==day){list.append(el("p","lpt-text-date",message.date));day=message.date;sender="";}
      const together=sender===normalize(message.from)&&direction===message.direction;
      const item=el("article",`lpt-text-message ${message.direction==="outgoing"?"lpt-outgoing":"lpt-incoming"}${together?" lpt-text-continuation":""}`);
      if(group&&!together)item.append(el("p","lpt-text-sender",message.direction==="outgoing"?"You":message.from));item.append(el("p","lpt-text-body",message.text));if(message.time)item.append(el("span","lpt-text-time",message.time));list.append(item);sender=normalize(message.from);direction=message.direction;
    }
    if(!thread.messages.length)this.empty("No texts sent here yet. Your reply appears after you send it from the chat input.",list);card.append(list);
    if(thread.key){
      if(!this.prefs.dismissed.includes("Draft hint")){const hint=el("div","lpt-draft-hint"),hide=button("�","lpt-dismiss",()=>{void this.actions.preferences({dismiss:"Draft hint"}).then(p=>{this.receivePreferences(p);hint.remove();}).catch(()=>this.setError("Could not hide the explanation."));});hide.setAttribute("aria-label","Hide draft explanation");hint.append(el("small","lpt-help","Adds to the chat input for you to review. It does not send."),hide);card.append(hint);}
      const form=el("form","lpt-reply"),label=el("label","lpt-reply-label",`Reply to ${thread.name}`),input=el("textarea","lpt-textarea lpt-reply-input");input.rows=1;input.maxLength=3000;input.required=true;input.placeholder="Write a reply";input.value=this.replyDrafts.get(thread.key)??"";label.append(input);const selection=this.replySelections.get(thread.key);if(selection)input.setSelectionRange(selection.start,selection.end);input.addEventListener("select",()=>{if(epoch===this.chatEpoch&&input.isConnected)this.replySelections.set(thread.key,{start:input.selectionStart,end:input.selectionEnd});});
      const grow=()=>{const bottom=list.scrollHeight-list.clientHeight-list.scrollTop<30;input.rows=1;const css=getComputedStyle(input),height=input.scrollHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom);input.rows=Math.min(4,Math.max(1,Math.ceil(height/parseFloat(css.lineHeight))));if(bottom)list.scrollTop=list.scrollHeight;};input.addEventListener("input",()=>{if(epoch!==this.chatEpoch)return;this.replyDrafts.set(thread.key,input.value);grow();});requestAnimationFrame(grow);
      const add=el("button","lpt-button lpt-add-draft","Add to draft");add.type="submit";const status=el("p","lpt-reply-status lpt-help");status.setAttribute("aria-live","polite");const fallback=el("textarea","lpt-textarea lpt-manual-tag");fallback.readOnly=true;fallback.setAttribute("aria-label","Text tag to copy into the chat input");fallback.value=this.manualDrafts.get(thread.key)??"";fallback.hidden=!fallback.value;form.append(label,add,status,fallback);const emoji=attachEmojiPicker(form,input,status,()=>epoch===this.chatEpoch&&this.doc?.chatId===chatId&&form.isConnected);form.insertBefore(emoji,add);
      form.addEventListener("submit",event=>{event.preventDefault();if(epoch!==this.chatEpoch||this.doc?.chatId!==chatId||!form.isConnected)return;try{const contact=!thread.group?this.doc?.state.contacts.find(c=>normalize(c.name)===thread.key):undefined;const phone=contact?.info?.phone;const recipient=phone&&contactMatch(this.doc!,phone)===contact?.name?phone:thread.name;const result=this.actions.draft(chatId,recipient,input.value,thread.group?thread.name:undefined);if(result.manual){this.manualDrafts.set(thread.key,result.tag);fallback.value=result.tag;fallback.hidden=false;status.textContent="Copy this tag into the chat input, then review and send it yourself.";fallback.select();}else{this.replyDrafts.delete(thread.key);this.replySelections.delete(thread.key);this.manualDrafts.delete(thread.key);input.value="";grow();fallback.value="";fallback.hidden=true;status.textContent="Added to the chat draft. Review it there.";}}catch(error){status.textContent=error instanceof Error?error.message:"Could not add to draft. Your reply is still here.";}});card.append(form);
    }
    parent.append(card);
  }
  private unreadBadge(key: string): HTMLElement { const badge = el("span", "lpt-unread-badge"); badge.dataset.unreadFor = key; badge.hidden = true; return badge; }
  private refreshBadges(): void {
    const counts = new Map(conversations(this.doc?.state.messages ?? [], this.reads).map(t => [t.key, t.unread]));
    for (const badge of Array.from(this.root.querySelectorAll<HTMLElement>(".lpt-unread-badge"))) {
      const special=badge.dataset.unreadFor;const activityCount=special==="@calls"?this.doc?.state.calls.filter(c=>c.direction==="missed"&&activityUnread(c,this.reads.seen)).length:special==="@email"?this.doc?.state.emails.filter(e=>e.direction==="incoming"&&activityUnread(e,this.reads.seen)).length:undefined;
      const count = activityCount!==undefined?((special==="@calls"?this.enabled("calls"):this.enabled("email"))?activityCount:0):!this.enabled("messages") ? 0 : badge.dataset.unreadFor === "*" ? [...counts.values()].reduce((a,b) => a+b,0) : counts.get(badge.dataset.unreadFor ?? "") ?? 0;
      badge.hidden = !count; badge.textContent = String(count); badge.setAttribute("aria-label", `${count} unread ${special==="@calls"?"missed calls":special==="@email"?"emails":"texts"}`);
    }
  }
  private markVisibleConversation(): void {
    if (!this.doc || !this.openState || this.app !== "Messages" || this.selectedText === null || !this.enabled("messages") || document.visibilityState === "hidden") return;
    const visibleCard = Array.from(this.content.querySelectorAll<HTMLElement>(".lpt-thread")).find(c => c.dataset.conversation === this.selectedText);
    if (!visibleCard || !this.frame.getClientRects().length) return;
    const observed = this.doc.state.messages.filter(m => threadKey(m) === this.selectedText && isUnread(m,this.reads)).map(m => ({ id:m.id, receipt:receipt(m) }));
    if (!observed.length) return;
    const chatId = this.doc.chatId; const epoch = this.chatEpoch; const key = this.selectedText; const pendingKey = JSON.stringify([chatId,key,observed]);
    if (this.pendingReads.has(pendingKey)) return; this.pendingReads.add(pendingKey);
    void this.actions.markRead(chatId,key,observed).then(value => {
      if (epoch === this.chatEpoch && this.doc?.chatId === chatId) this.receiveReads(value);
    }).catch(() => { if (epoch === this.chatEpoch && this.doc?.chatId === chatId) this.setError("Read status could not be saved. Reopen this conversation to try again."); })
      .finally(() => this.pendingReads.delete(pendingKey));
  }
  private activities(app:"Calls"|"Email"|"Bank"):void{
    const section=el("section",`lpt-${app.toLowerCase()} lpt-activity`);this.content.append(section);
    const kind=app==="Calls"?"call":app==="Email"?"email":"bank";
    const add=(type:"call"|"email"|"bank"|"transaction",entry?:Record<string,unknown>)=>this.activityForm(section,type,entry);
    if(app==="Calls"){
      if(!this.enabled("calls")){this.empty("Calls is off. Change it in the sidebar's Phone tab.",section);return;}
      section.append(button("+ Add call","lpt-add",()=>add("call")));
      if(!this.doc!.state.calls.length)this.empty("No calls recorded. This fills only when the story establishes a call.",section);
      for(const c of [...this.doc!.state.calls].reverse()){const card=el("article","lpt-card lpt-call");const name=contactMatch(this.doc!,c.name)??this.doc!.state.contacts.find(x=>normalize(x.name)===normalize(c.name))?.name??c.name;card.append(el("h2","lpt-card-title",name),el("p","lpt-call-direction",(c.direction==="in"?"Incoming":c.direction==="out"?"Outgoing":"Missed")+((c.count??1)>1?` x${c.count}`:"")));if(c.time)card.append(el("p","lpt-muted",c.time));this.activityControls(card,"call",c as unknown as Record<string,unknown>,add);section.append(card);}
    }else if(app==="Email"){
      if(!this.enabled("email")){this.empty("Email is off. Change it in the sidebar's Phone tab.",section);return;}
      section.append(button("+ Add email record","lpt-add",()=>add("email")));
      if(!this.doc!.state.emails.length)this.empty("No emails recorded. Actual story emails will appear here.",section);
      for(const e of [...this.doc!.state.emails].reverse()){const card=el("details","lpt-card lpt-email");card.dataset.email=e.id;const summary=el("summary","lpt-email-summary");summary.append(el("strong","lpt-email-from",contactMatch(this.doc!,e.from,"email")??e.from),el("span","lpt-email-subject",e.subject));if(e.time)summary.append(el("small","lpt-muted",e.time));if(e.direction==="incoming"&&activityUnread(e,this.reads.seen))summary.append(el("span","lpt-email-unread","Unread"));else if(e.direction==="outgoing")summary.append(el("small","lpt-muted","Outgoing"));const body=el("div","lpt-card-body");if(e.to)body.append(el("p","lpt-muted",`To: ${e.to}`));body.append(el("p","lpt-email-body",e.body));this.activityControls(body,"email",e as unknown as Record<string,unknown>,add);card.append(summary,body);card.addEventListener("toggle",()=>{if(card.open){card.querySelector(".lpt-email-unread")?.remove();this.markVisibleActivity();}});section.append(card);}
    }else{
      if(this.enabled("bank.balance")){section.append(button("+ Add account","lpt-add",()=>add("bank")));if(!this.doc!.state.bank.length)this.empty("No balances stated. The tracker never calculates a balance.",section);for(const b of this.doc!.state.bank){const card=el("article","lpt-card lpt-bank-account");const stale=this.doc!.state.transactions.some(t=>t.at.index>b.at.index);card.append(el("h2","lpt-card-title",b.name),el("p","lpt-bank-balance",`${stale?"Last stated":"Balance"}: ${b.balance}`));if(b.time)card.append(el("p","lpt-bank-time",`As of ${b.time}`));this.activityControls(card,"bank",b as unknown as Record<string,unknown>,add);section.append(card);}}
      if(this.enabled("bank.transactions")){section.append(el("h2","lpt-section-title","Recent transactions"),button("+ Add transaction","lpt-add",()=>add("transaction")));if(!this.doc!.state.transactions.length)this.empty("No transactions stated. Adding one never changes a balance.",section);for(const t of [...this.doc!.state.transactions].reverse()){const card=el("article","lpt-card lpt-bank-transaction");card.append(el("strong","lpt-card-title",t.description),el("p","lpt-transaction-amount",t.amount));if(t.time)card.append(el("p","lpt-muted",t.time));this.activityControls(card,"transaction",t as unknown as Record<string,unknown>,add);section.append(card);}}
      if(!this.enabled("bank.balance")&&!this.enabled("bank.transactions"))this.empty("Bank fields are off. Change them in the sidebar's Phone tab.",section);
    }
  }
  private activityControls(parent:HTMLElement,target:"call"|"email"|"bank"|"transaction",entry:Record<string,unknown>,add:(type:typeof target,entry:Record<string,unknown>)=>void):void{const controls=el("div","lpt-actions");controls.append(button("Edit","lpt-button",()=>add(target,entry)));this.deleteAction(controls,{target,name:String(entry.id)});parent.append(controls);if(entry.by==="user"&&isRecord(entry.at)&&entry.at.variant==="manual")parent.append(el("small","lpt-marker","edited by you"));}
  private activityForm(parent:HTMLElement,target:"call"|"email"|"bank"|"transaction",entry?:Record<string,unknown>):void{
    const fields=target==="call"?[["name","Name or number"],["direction","Direction"],["time","Time (optional)"],["count","Repeat count"]]:target==="email"?[["from","Sender"],["to","To (optional)"],["subject","Subject"],["body","Body"],["time","Time (optional)"]]:target==="bank"?[["name","Account"],["balance","Stated balance"],["time","As of (optional)"]]:[["description","Description"],["amount","Stated amount"],["time","Time (optional)"]];
    this.form(parent,fields.map(([key,label])=>({key,label,value:String(entry?.[key]??(key==="direction"?"in":key==="count"?1:"")),...(key==="direction"?{options:[["in","Incoming"],["out","Outgoing"],["missed","Missed"]] as [string,string][]}:{}),number:key==="count",required:!label.includes("optional"),multiline:key==="body",max:key==="body"?1500:key==="description"?240:key==="subject"?200:100})),values=>({edit:{target,...(entry?{name:String(entry.id)}:{}),value:Object.fromEntries(Object.entries(values).filter(([,v])=>v!=="").map(([k,v])=>[k,k==="count"?Number(v):v]))}}));
  }
  private markVisibleActivity():void{
    if(!this.doc||!this.openState||document.visibilityState==="hidden"||!this.frame.getClientRects().length)return;
    const kind=this.app==="Calls"&&this.enabled("calls")?"@calls":this.app==="Email"&&this.enabled("email")?"@email":null;if(!kind)return;
    const entries=kind==="@calls"?this.doc.state.calls.filter(c=>c.direction==="missed"):this.doc.state.emails.filter(e=>e.direction==="incoming"&&Array.from(this.root.querySelectorAll<HTMLDetailsElement>(".lpt-email[open]")).some(d=>d.dataset.email===e.id));
    const observed=entries.filter(e=>activityUnread(e,this.reads.seen)).map(e=>({id:e.id,receipt:activityReceipt(e)}));if(!observed.length)return;const chatId=this.doc.chatId,epoch=this.chatEpoch,key=JSON.stringify([kind,chatId,observed]);if(this.pendingReads.has(key))return;this.pendingReads.add(key);
    void this.actions.markRead(chatId,kind,observed).then(reads=>{if(epoch===this.chatEpoch&&this.doc?.chatId===chatId)this.receiveReads(reads);}).catch(()=>{if(epoch===this.chatEpoch)this.setError("Read status could not be saved. Reopen the app to try again.");}).finally(()=>this.pendingReads.delete(key));
  }
  private clearTextNotice(): void { clearTimeout(this.noticeTimer); this.textNotice.textContent = ""; this.textNotice.hidden = true; this.root.dataset.notice = "false"; }
  private showTextNotice(text: string): void {
    this.clearTextNotice(); renderEmojiText(this.textNotice,text); this.textNotice.hidden = false; this.root.dataset.notice = "true";
    this.noticeTimer = setTimeout(() => { this.clearTextNotice(); this.measure(); }, 5000); requestAnimationFrame(() => this.measure());
  }
}

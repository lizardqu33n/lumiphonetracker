import type { Cell, Contact, Document as PhoneDocument, ManualEdit, Note, Section, Settings } from "./model";
import { CONTACT_KEYS, SCENE_KEYS, SECTIONS, normalize } from "./model";
import { APPS, defaultPreferences, type App, type Preferences } from "./preferences";
import { prepareCustomCSS } from "./custom-css";
import { HOME_ICONS, type IconNode } from "./icons";
import { conversations, emptyReads, isUnread, receipt, threadKey, type Conversation, type ReadState } from "./messages";
import type { ConnectionsInfo } from "./helper";
import { isRecord } from "./shared";

export interface ViewActions {
  update(change: { edit?: Partial<ManualEdit>; settings?: unknown; dismissNotice?: string }, revision: number): Promise<PhoneDocument>;
  preferences(change: { css?: string; dismiss?: App }): Promise<Preferences>;
  markRead(chatId: string, key: string, observed: { id: string; receipt: string }[]): Promise<ReadState>;
  draft(chatId: string, to: string, text: string): { manual: boolean; tag: string };
  connections():Promise<ConnectionsInfo>;
  updateNow():Promise<void>;
  size(width: number, height: number, open: boolean): void;
}
const DESCRIPTIONS: Record<App, string> = {
  Scene: "Where the story is happening right now.", Weather: "Only the weather the story has established.",
  Locations: "Places that matter in this story.", Notes: "People, items, rules, and plans worth remembering.",
  Contacts: "What the story has established about each character.", Messages: "Texts actually sent in the story.",
  Settings: "Choose what the phone shows and what the AI keeps track of.",
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
  const node = document.createElement(tag); node.className = cls; if (text !== undefined) node.textContent = text; return node;
}
function icon(name: string): SVGSVGElement {
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
interface FormField { key: string; label: string; value: string; multiline?: boolean; required?: boolean; max?: number; check?: boolean }

/** Ordinary DOM renderer mounted inside the phone's isolated shadow tree. */
export class PhoneView {
  readonly root = el("div", "lpt-root");
  readonly launcher = button("", "lpt-launcher", () => this.open());
  private frame = el("section", "lpt-frame");
  private content = el("main", "lpt-content");
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
  private cssTimer: ReturnType<typeof setTimeout> | undefined;
  private observer: ResizeObserver;
  private selectedText: string | null = null;
  private probe = el("div", "lpt-size-probe");
  private reads = emptyReads();
  private pendingReads = new Set<string>();
  private chatEpoch = 0;
  private replyDrafts = new Map<string, string>();
  private manualDrafts = new Map<string, string>();
  private textNotice = el("p", "lpt-text-notice");
  private noticeTimer: ReturnType<typeof setTimeout> | undefined;
  private connectionsInfo:ConnectionsInfo={available:false,choices:[],note:"Loading connections…"};
  private helperChoice=false;
  private helperBusy=false;
  constructor(private mount: ShadowRoot | HTMLElement, private customStyle: HTMLStyleElement, private actions: ViewActions) {
    this.launcher.setAttribute("aria-label", "Open Lumi Phone Tracker"); this.launcher.append(icon("Phone"));
    this.back.setAttribute("aria-label", "Back to Home"); this.back.append(icon("Back"));
    const close = button("", "lpt-close", () => this.close()); close.setAttribute("aria-label", "Close phone"); close.append(icon("Close"));
    const header = el("header", "lpt-header"); header.append(this.back, this.heading, close);
    const speaker = el("div", "lpt-speaker"); speaker.setAttribute("aria-hidden", "true");
    this.textNotice.setAttribute("role", "status"); this.textNotice.setAttribute("aria-live", "polite"); this.textNotice.hidden = true;
    this.frame.setAttribute("aria-label", "Lumi Phone Tracker"); this.frame.append(speaker, header, this.textNotice, this.content);
    this.probe.setAttribute("aria-hidden", "true"); this.root.append(this.launcher, this.frame, this.probe); mount.append(this.root);
    this.root.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); this.close(); } });
    this.observer = new ResizeObserver(() => this.measure()); this.observer.observe(this.root); this.observer.observe(this.probe); this.observer.observe(this.launcher);
    this.render(); this.setOpen(false);
  }
  receive(doc: PhoneDocument | null, reads?: ReadState): void {
    const changedChat = doc?.chatId !== this.doc?.chatId;
    if(this.doc?.settings.source==="helper"&&doc?.settings.source==="main")this.helperChoice=false;
    const previous = new Set(this.doc?.state.messages.filter(m => m.direction === "incoming").map(m => JSON.stringify([m.id, receipt(m)])) ?? []);
    const arrived = !changedChat && this.doc && doc?.settings.enabled.messages ? doc.state.messages.filter(m => m.direction === "incoming" && !previous.has(JSON.stringify([m.id, receipt(m)]))) : [];
    this.doc = doc;
    if (changedChat) {
      this.chatEpoch++; this.pendingReads.clear(); this.reads = reads ?? emptyReads(); this.replyDrafts.clear(); this.manualDrafts.clear();
      this.clearTextNotice(); this.editing = false; this.app = "Home"; this.selectedText = null;
      this.helperChoice=false; this.helperBusy=false;
      if(doc)void this.loadConnections();
    } else if (reads && reads.revision >= this.reads.revision) this.reads = reads;
    if (!doc?.settings.enabled.messages) this.clearTextNotice();
    else if (arrived.length) this.showTextNotice(arrived.length === 1 ? `New text from ${arrived[0].from}` : `${arrived.length} new texts`);
    if (!this.editing || changedChat) this.render(); else this.refreshBadges();
    this.markVisibleConversation();
  }
  receiveReads(reads: ReadState): void { if (reads.revision >= this.reads.revision) { this.reads = reads; this.refreshBadges(); } }
  receiveHelperBusy(busy:boolean):void {this.helperBusy=busy;const button=this.root.querySelector<HTMLButtonElement>(".lpt-update-now");if(button){button.disabled=busy;button.textContent=busy?"Please wait…":"Update now";}}
  private async loadConnections():Promise<void> {
    const epoch=this.chatEpoch;
    try{const info=await this.actions.connections();if(epoch!==this.chatEpoch)return;this.connectionsInfo=info;}
    catch{if(epoch!==this.chatEpoch)return;this.connectionsInfo={available:false,choices:[],note:"Connections are unavailable. Main AI still works."};}
    if(this.app==="Settings"&&!this.editing&&!this.busy)this.render();
  }
  receivePreferences(prefs: Preferences): void { if (prefs.revision >= this.prefs.revision) this.prefs = prefs; }
  setError(message: string): void { this.error.textContent = message; }
  setStatus(message: string): void { this.status.textContent = message; }
  fit(): void { this.measure(); }
  applyCSS(text: string): string {
    const css = prepareCustomCSS(text); this.customStyle.textContent = css;
    requestAnimationFrame(() => this.measure()); return css;
  }
  resetCSS(): void {
    clearTimeout(this.cssTimer); this.customStyle.textContent = ""; this.prefs = { ...this.prefs, css: "" };
    const editor = this.root.querySelector<HTMLTextAreaElement>(".lpt-css-editor"); if (editor) editor.value = "";
    this.setOpen(true); requestAnimationFrame(() => this.measure());
  }
  open(app?: App): void { if (app) this.navigate(app); this.setOpen(true); this.back.hidden ? this.frame.querySelector<HTMLElement>(".lpt-app-button, .lpt-close")?.focus() : this.back.focus(); }
  close(): void { this.setOpen(false); this.launcher.focus(); }
  destroy(): void { clearTimeout(this.cssTimer); clearTimeout(this.noticeTimer); this.chatEpoch++; this.observer.disconnect(); this.root.remove(); }
  private setOpen(open: boolean): void {
    this.openState = open; this.root.dataset.open = String(open); this.frame.hidden = !open; this.launcher.hidden = open;
    if (open) this.frame.insertBefore(this.textNotice, this.content); else this.root.insertBefore(this.textNotice, this.frame);
    this.measure(); this.markVisibleConversation();
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
  private navigate(app: App | "Home"): void { this.app = app; this.editing = false; this.render(); this.content.scrollTop = 0; if(app==="Settings")void this.loadConnections(); }
  private render(): void {
    const focused = this.mount instanceof ShadowRoot ? this.mount.activeElement : document.activeElement;
    const replyFocus = focused instanceof HTMLTextAreaElement && focused.classList.contains("lpt-reply-input") ? {
      key: focused.closest<HTMLElement>(".lpt-conversation")?.dataset.conversation, start: focused.selectionStart, end: focused.selectionEnd,
    } : null;
    this.content.replaceChildren(); this.error.textContent = ""; this.status.textContent = "";
    this.heading.textContent = this.app === "Home" ? "Lumi Phone Tracker" : this.app;
    this.back.hidden = this.app === "Home";
    if (this.app === "Home") {
      const home = el("div", "lpt-home");
      for (const app of APPS) {
        const b = button("", "lpt-app-button", () => this.navigate(app)); b.dataset.app = app;
        const image = el("span", "lpt-app-icon"); image.append(icon(app));
        b.append(image, el("span", "lpt-app-label", app));
        if (app === "Messages") image.append(this.unreadBadge("*")); home.append(b);
      }
      this.content.append(home);
      if (!this.doc) this.content.append(el("p", "lpt-empty", "Open a chat to start keeping track of your story."));
    } else {
      if (!this.prefs.dismissed.includes(this.app)) this.description(this.app);
      if (!this.doc && this.app !== "Settings") this.empty("Open a chat first. Each chat keeps its own story information.");
      else if (this.app === "Scene") this.scene();
      else if (this.app === "Weather") this.weather();
      else if (this.app === "Contacts") this.contacts();
      else if (this.app === "Locations") this.locations();
      else if (this.app === "Notes") this.notes();
      else if (this.app === "Messages") this.messages();
      else this.settings();
    }
    if (this.doc) for (const text of this.doc.state.notices) {
      const notice = el("div", "lpt-notice");
      notice.append(el("span", "lpt-notice-text", text), button("Dismiss", "lpt-dismiss", () => { void this.change({ dismissNotice: text }); }));
      const helperGroup=this.app==="Settings"&&["Tracker update failed","Connection not found"].includes(text)?this.content.querySelector(".lpt-helper-settings"):null;
      if(helperGroup)helperGroup.insertBefore(notice,helperGroup.children.item(1));else this.content.append(notice);
    }
    this.error.setAttribute("role", "alert"); this.status.setAttribute("aria-live", "polite"); this.content.append(this.error, this.status);
    this.refreshBadges();
    if (replyFocus) {
      const card = Array.from(this.content.querySelectorAll<HTMLElement>(".lpt-conversation")).find(c => c.dataset.conversation === replyFocus.key);
      const input = card?.querySelector<HTMLTextAreaElement>(".lpt-reply-input");
      if (input) { input.focus(); input.setSelectionRange(replyFocus.start, replyFocus.end); }
    }
    requestAnimationFrame(() => this.measure());
  }
  private description(app: App): void {
    const row = el("div", "lpt-description");
    const dismiss = button("×", "lpt-dismiss", () => {
      row.remove(); void this.actions.preferences({ dismiss: app }).then(p => { this.receivePreferences(p); }).catch(() => this.setError("That explanation could not be hidden for next time."));
    });
    dismiss.setAttribute("aria-label", `Hide ${app} explanation`); row.append(el("p", "lpt-description-text", DESCRIPTIONS[app]), dismiss); this.content.append(row);
  }
  private empty(text: string, parent: HTMLElement = this.content): void { parent.append(el("p", "lpt-empty", text)); }
  private enabled(key: string): boolean { return this.doc?.settings.enabled[key] === true; }
  private async change(change: Parameters<ViewActions["update"]>[0], revision = this.doc?.revision ?? -1): Promise<void> {
    if (!this.doc || this.busy) return;
    this.busy = true; this.setStatus("Saving…");
    const controls = this.root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | HTMLSelectElement>(".lpt-setting input, .lpt-helper-source, .lpt-helper-connection, .lpt-form input, .lpt-form textarea, .lpt-form button, .lpt-add, .lpt-field, .lpt-delete");
    controls.forEach(control => { control.disabled = true; });
    try {
      const doc = await this.actions.update(change, revision); this.editing = false; this.doc = doc;
      if(isRecord(change.settings)&&change.settings.source==="helper"&&doc.settings.source==="main")this.helperChoice=false;
      this.render();
      this.setStatus("Saved.");
    } catch (e) { this.setStatus(""); this.setError(e instanceof Error ? e.message : "Could not save. Your changes are still here."); }
    finally { this.busy = false; controls.forEach(control => { control.disabled = false; }); }
  }
  private form(parent: HTMLElement, fields: FormField[], save: (values: Record<string, string | boolean>) => Parameters<ViewActions["update"]>[0]): void {
    if (this.editing) return;
    this.editing = true; const revision = this.doc?.revision ?? -1;
    const form = el("form", "lpt-form"); const controls = new Map<string, HTMLInputElement | HTMLTextAreaElement>();
    for (const f of fields) {
      const label = el("label", "lpt-label", f.label);
      const input = f.multiline ? el("textarea", "lpt-textarea") : el("input", f.check ? "lpt-toggle" : "lpt-input");
      if (input instanceof HTMLInputElement) input.type = f.check ? "checkbox" : "text";
      if (f.check && input instanceof HTMLInputElement) input.checked = f.value === "true";
      else input.value = f.value;
      input.required = f.required === true; input.maxLength = f.max ?? 500;
      input.name = f.key; controls.set(f.key, input); label.append(input); form.append(label);
    }
    const actions = el("div", "lpt-actions"); const submit = el("button", "lpt-save", "Save"); submit.type = "submit";
    actions.append(submit, button("Cancel", "lpt-cancel", () => { this.editing = false; this.render(); })); form.append(actions);
    form.addEventListener("submit", e => {
      e.preventDefault();
      const values: Record<string, string | boolean> = {};
      for (const [key, input] of controls) values[key] = input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked : input.value.trim();
      void this.change(save(values), revision);
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
    for (const key of SCENE_KEYS) if (this.enabled(`scene.${key}`)) this.field(section, key, this.doc!.state.scene[key], "scene");
    if (!section.children.length) this.empty("Scene fields are off. Turn them on in Settings.", section);
    this.content.append(section);
  }
  private weather(): void {
    const section = el("section", "lpt-weather");
    if (this.enabled("weather")) this.field(section, "weather", this.doc!.state.weather, "weather");
    else this.empty("Weather is off. Turn it on in Settings.", section);
    this.content.append(section);
  }
  private deleteAction(parent: HTMLElement, edit: Partial<ManualEdit>): void {
    const b = button("Delete", "lpt-delete", () => {
      const row = el("div", "lpt-actions"); row.append(el("span", "lpt-help", "Delete this entry?"),
        button("Delete", "lpt-delete", () => { void this.change({ edit: { ...edit, remove: true } }); }),
        button("Cancel", "lpt-cancel", () => row.remove())); b.replaceWith(row);
    }); parent.append(b);
  }
  private contacts(): void {
    const section = el("section", "lpt-contacts"); this.content.append(section);
    const enabledFields = CONTACT_KEYS.filter(k => this.enabled(`contacts.${k}`));
    if (!enabledFields.length) { this.empty("Contact fields are off. Turn them on in Settings.", section); return; }
    section.append(button("+ Add contact", "lpt-add", () => this.contactForm(section)));
    const v = this.doc!.state.scene.present?.value; const present = new Set((Array.isArray(v) ? v : []).map(normalize));
    const contacts = this.doc!.state.contacts;
    for (const c of contacts.filter(c => present.has(normalize(c.name)))) this.contactCard(section, c, true);
    const absent = contacts.filter(c => !present.has(normalize(c.name)));
    if (absent.length) {
      const group = el("details", "lpt-absent lpt-section"); group.append(el("summary", "lpt-summary", `Not here now (${absent.length})`));
      for (const c of absent) this.contactCard(group, c, false); section.append(group);
    }
    if (!contacts.length) this.empty("No contacts yet. Named characters appear when the story establishes them.", section);
  }
  private contactCard(parent: HTMLElement, c: Contact, here: boolean): void {
    const card = el("details", "lpt-card lpt-contact"); const summary = el("summary", "lpt-summary");
    summary.append(el("span", "lpt-card-title", c.name), ...(c.player ? [el("span", "lpt-marker", "You")] : []));
    if (c.editedByUser) summary.append(el("span", "lpt-marker", "edited by you"));
    if (!c.player && this.enabled("contacts.roles") && Array.isArray(c.fields.roles?.value) && c.fields.roles.value.length) summary.append(el("span", "lpt-card-subtitle", c.fields.roles.value.join(" / ")));
    summary.append(el("span", "lpt-card-subtitle", here ? "Here now" : `Last seen: ${c.lastSeen ?? "not established"}`));
    const body = el("div", "lpt-card-body");
    for (const key of CONTACT_KEYS) if (this.enabled(`contacts.${key}`) && (!c.player || ["physical", "position", "attire"].includes(key))) this.field(body, key, c.fields[key], "contact", c);
    const actions = el("div", "lpt-actions");
    const openTexts = button("Open texts", "lpt-open-texts", () => { this.selectedText = normalize(c.name); this.navigate("Messages"); this.markVisibleConversation(); });
    openTexts.append(this.unreadBadge(normalize(c.name)));
    actions.append(button("Edit name", "lpt-button", () => this.contactForm(body, c)), openTexts);
    this.deleteAction(actions, { target: "contact", name: c.name }); body.append(actions); card.append(summary, body); parent.append(card);
  }
  private contactForm(parent: HTMLElement, contact?: Contact): void {
    if (!contact && this.doc!.state.contacts.length >= 30) { this.setError("Contacts is full (30/30). Delete a contact to make room."); return; }
    this.form(parent, [{ key: "name", label: "Name", value: contact?.name ?? "", required: true, max: 100 }], v => ({ edit: {
      target: "contact", name: contact?.name ?? String(v.name), ...(contact && v.name !== contact.name ? { rename: String(v.name) } : {}), value: {},
    } }));
  }
  private locations(): void {
    const section = el("section", "lpt-locations"); this.content.append(section);
    if (!this.enabled("locations")) { this.empty("Locations is off. Turn it on in Settings.", section); return; }
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
    if (!shown) this.empty("All Notes sections are off. Turn one on in Settings.", section);
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
  private messages(): void {
    const section = el("section", "lpt-messages"); this.content.append(section);
    if (!this.enabled("messages")) { this.empty("Messages is off. Turn it on in Settings.", section); return; }
    const threads = conversations(this.doc!.state.messages, this.reads);
    if (this.selectedText !== null && !threads.some(t => t.key === this.selectedText)) {
      const contact = this.doc!.state.contacts.find(c => normalize(c.name) === this.selectedText);
      if (contact) threads.push({ key: normalize(contact.name), name: contact.name, messages: [], unread: 0 });
    }
    if (!threads.length) this.empty("No texts yet. Texts actually sent in the story appear here, grouped by sender.", section);
    for (const thread of threads) this.conversation(section, thread);
  }
  private conversation(parent: HTMLElement, thread: Conversation): void {
    const chatId = this.doc!.chatId;
    const card = el("details", "lpt-card lpt-conversation"); card.dataset.conversation = thread.key;
    const summary = el("summary", "lpt-summary"); summary.append(el("span", "lpt-card-title", thread.name), this.unreadBadge(thread.key));
    if (!thread.key) summary.append(el("span", "lpt-card-subtitle", "Recipient not stated"));
    const body = el("div", "lpt-card-body"); const list = el("div", "lpt-text-list");
    for (const message of thread.messages) {
      const item = el("article", `lpt-text-message${message.direction === "outgoing" ? " lpt-outgoing" : " lpt-incoming"}`);
      item.append(el("p", "lpt-text-sender", `${message.direction === "outgoing" ? "You · " : ""}${message.from}`), el("p", "lpt-text-body", message.text));
      if (message.time) item.append(el("span", "lpt-text-time", message.time)); list.append(item);
    }
    if (!thread.messages.length) this.empty("No texts sent here yet. Your reply will appear only after you send it from the chat input.", list);
    body.append(list);
    if (thread.key) {
      const form = el("form", "lpt-reply"); const label = el("label", "lpt-label", `Reply to ${thread.name}`);
      const input = el("textarea", "lpt-textarea lpt-reply-input"); input.maxLength = 3000; input.required = true; input.value = this.replyDrafts.get(thread.key) ?? "";
      input.addEventListener("input", () => { if (this.doc?.chatId === chatId) this.replyDrafts.set(thread.key, input.value); }); label.append(input);
      const add = el("button", "lpt-button lpt-add-draft", "Add to draft"); add.type = "submit";
      const status = el("p", "lpt-reply-status lpt-help"); status.setAttribute("aria-live", "polite");
      const fallback = el("textarea", "lpt-textarea lpt-manual-tag"); fallback.readOnly = true; fallback.setAttribute("aria-label", "Text tag to copy into the chat input");
      fallback.value = this.manualDrafts.get(thread.key) ?? ""; fallback.hidden = !fallback.value;
      if (fallback.value) status.textContent = "Drafting is unavailable here. Copy this tag into the chat input, then review and send it yourself.";
      form.append(label, add, el("p", "lpt-help", "Adds to the chat input for you to review. It does not send."), status, fallback);
      form.addEventListener("submit", e => {
        e.preventDefault();
        try {
          const result = this.actions.draft(chatId, thread.name, input.value);
          if (result.manual) {
            this.manualDrafts.set(thread.key,result.tag); fallback.value = result.tag; fallback.hidden = false;
            status.textContent = "Drafting is unavailable here. Copy this tag into the chat input, then review and send it yourself."; fallback.select();
          } else {
            this.replyDrafts.delete(thread.key); this.manualDrafts.delete(thread.key); input.value = ""; fallback.value = ""; fallback.hidden = true;
            status.textContent = "Added to the chat draft. Review it there and send it yourself.";
          }
        } catch (error) { status.textContent = error instanceof Error ? error.message : "Could not add to the draft. Your reply is still here."; }
      }); body.append(form);
    }
    card.append(summary, body); parent.append(card); card.open = this.selectedText === thread.key;
    card.addEventListener("toggle", () => {
      if (card.open) {
        this.selectedText = thread.key;
        for (const other of Array.from(this.content.querySelectorAll<HTMLDetailsElement>(".lpt-conversation"))) if (other !== card) other.open = false;
        this.markVisibleConversation();
      } else if (this.selectedText === thread.key) this.selectedText = null;
    });
  }
  private unreadBadge(key: string): HTMLElement { const badge = el("span", "lpt-unread-badge"); badge.dataset.unreadFor = key; badge.hidden = true; return badge; }
  private refreshBadges(): void {
    const counts = new Map(conversations(this.doc?.state.messages ?? [], this.reads).map(t => [t.key, t.unread]));
    for (const badge of Array.from(this.root.querySelectorAll<HTMLElement>(".lpt-unread-badge"))) {
      const count = !this.enabled("messages") ? 0 : badge.dataset.unreadFor === "*" ? [...counts.values()].reduce((a,b) => a+b,0) : counts.get(badge.dataset.unreadFor ?? "") ?? 0;
      badge.hidden = !count; badge.textContent = String(count); badge.setAttribute("aria-label", `${count} unread texts`);
    }
  }
  private markVisibleConversation(): void {
    if (!this.doc || !this.openState || this.app !== "Messages" || this.selectedText === null || !this.enabled("messages") || document.visibilityState === "hidden") return;
    const visibleCard = Array.from(this.content.querySelectorAll<HTMLDetailsElement>(".lpt-conversation")).find(c => c.open && c.dataset.conversation === this.selectedText);
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
  private clearTextNotice(): void { clearTimeout(this.noticeTimer); this.textNotice.textContent = ""; this.textNotice.hidden = true; this.root.dataset.notice = "false"; }
  private showTextNotice(text: string): void {
    this.clearTextNotice(); this.textNotice.textContent = text; this.textNotice.hidden = false; this.root.dataset.notice = "true";
    this.noticeTimer = setTimeout(() => { this.clearTextNotice(); this.measure(); }, 5000); requestAnimationFrame(() => this.measure());
  }
  private settings(): void {
    const section = el("section", "lpt-settings"); this.content.append(section);
    if (this.doc) {
      this.helperSettings(section);
      const groups: [string, [string, string, string][]][] = [
        ["Scene", [["scene.location", "Location", "Exact place and known wider places."], ["scene.time", "Time", "The established story time."], ["scene.date", "Date", "The established story date."], ["scene.present", "Who is present", "Everyone here now, by name."]]],
        ["Weather", [["weather", "Weather", "Only weather established by the story."]]],
        ["Locations", [["locations", "Locations", "Meaningful places and their known details."]]],
        ["Contacts", CONTACT_KEYS.map(k => [`contacts.${k}`, FIELD_NAMES[k], ({ roles: "Ordered roles or affiliations.", physical: "Observable body condition, not emotions.", mood: "Established mood, NPCs only.", position: "Facing and position relative to others.", attire: "Complete worn items and recently removed items.", thoughts: "One short private line, NPCs only." })[k]])],
        ["Notes", SECTIONS.map(k => [`notes.${k}`, SECTION_NAMES[k], ({ people: "People with a clear reason to return.", items: "Items with a specific story function.", rules: "Explicit principles or restrictions.", plots: "Concrete promises, meetings, and pending events.", misc: "Your own notes; you choose what the AI sees." })[k]])],
        ["Messages", [["messages", "Messages", "Texts actually sent in the story."]]],
      ];
      for (const [title, switches] of groups) {
        const group = el("section", "lpt-settings-group lpt-section"); group.append(el("h2", "lpt-section-title", title));
        for (const [key, label, description] of switches) this.toggle(group, label, description, this.enabled(key), value => ({ enabled: { [key]: value } }));
        if (title === "Contacts") this.toggle(group, "Let the AI fill in missing details", "Off by default. New inferred contact values are marked.", this.doc.settings.inferMissing, inferMissing => ({ inferMissing }));
        if (title === "Messages") this.toggle(group, "Let the AI write texts for my character", "Off by default. Your own sent texts still count.", this.doc.settings.aiPlayerTexts, aiPlayerTexts => ({ aiPlayerTexts }));
        section.append(group);
      }
    } else this.empty("Open a chat to change what is tracked. Appearance can still be reset here.", section);
    const advanced = el("details", "lpt-advanced"); advanced.append(el("summary", "lpt-summary", "Advanced"));
    if (this.doc) {
      this.number(advanced, "Recent messages to keep texts from", "Older text tags are left out of the AI's history.", "keepTexts", 1);
      this.number(advanced, "Keep tracker blocks in the last N messages", "0 sends continuity through the phone summaries only.", "keepTrackers", 0);
      this.number(advanced, "Notes per section", "Existing notes stay when you lower the limit.", "notesPerSection", 3, 30);
      this.number(advanced, "Log lines sent to the AI", "The phone still shows every note.", "logLines", 1);
    }
    const cssGroup = el("details", "lpt-custom-css"); cssGroup.append(el("summary", "lpt-summary", "Custom CSS"));
    const label = el("label", "lpt-label", "Custom CSS"); const input = el("textarea", "lpt-css-editor"); input.value = this.prefs.css; input.maxLength = 32000; input.spellcheck = false;
    label.append(input); cssGroup.append(label, el("p", "lpt-help", "Changes apply while you type. To restore the default look, use Reset appearance in the Phone sidebar entry."));
    input.addEventListener("input", () => {
      clearTimeout(this.cssTimer);
      try {
        this.applyCSS(input.value); this.setError("");
        this.cssTimer = setTimeout(() => { void this.actions.preferences({ css: input.value }).then(p => { this.receivePreferences(p); this.setStatus("Appearance saved."); }).catch(() => this.setError("Appearance could not be saved. Try again.")); }, 400);
      } catch (e) { this.setError(e instanceof Error ? e.message : "That CSS could not be applied."); }
    });
    advanced.append(cssGroup); section.append(advanced);
  }
  private helperSettings(parent:HTMLElement):void {
    const group=el("section","lpt-section lpt-helper-settings"); group.append(el("h2","lpt-section-title","Tracker source"));
    const sourceLabel=el("label","lpt-label","Who updates the tracker");const source=el("select","lpt-input lpt-helper-source");
    for(const [value,label]of [["main","Main AI"],["helper","Helper AI"]]){const option=el("option","lpt-option",label);option.value=value;source.append(option);}
    source.value=this.doc!.settings.source==="helper"||this.helperChoice?"helper":"main";
    source.addEventListener("change",()=>{
      this.helperChoice=source.value==="helper";
      if(source.value==="main")void this.change({settings:{source:"main"}});
      else if(this.doc!.settings.connection_id && this.connectionsInfo.available)void this.change({settings:{source:"helper"}});
      else this.render();
    });sourceLabel.append(source);group.append(sourceLabel);
    group.append(el("p","lpt-help","Main AI uses your normal reply. Helper AI makes a separate request."));
    if(source.value==="helper") {
      group.append(el("p","lpt-help","Requests may cost money depending on the model chosen."));
      const label=el("label","lpt-label","Connection");const select=el("select","lpt-input lpt-helper-connection");
      const empty=el("option","lpt-option","Choose a connection");empty.value="";select.append(empty);
      for(const choice of this.connectionsInfo.choices){const option=el("option","lpt-option",choice.label);option.value=choice.id;select.append(option);}
      select.value=this.doc!.settings.connection_id??"";select.disabled=!this.connectionsInfo.available;
      select.addEventListener("change",()=>{if(select.value)void this.change({settings:{source:"helper",connection_id:select.value}});});label.append(select);group.append(label);
      if(this.connectionsInfo.note)group.append(el("p","lpt-help",this.connectionsInfo.note));
      if(this.doc!.settings.source!=="helper")group.append(el("p","lpt-help","Choose a connection to turn Helper AI on."));
      this.number(group,"Messages to read","Only these recent messages and the compact tracker are sent.","helperMessages",1,10);
      if(this.doc!.settings.source==="helper") {
        const update=button(this.helperBusy?"Please wait…":"Update now","lpt-button lpt-update-now",()=>{
          const epoch=this.chatEpoch;update.disabled=true;
          void this.actions.updateNow().catch(()=>{if(epoch===this.chatEpoch)this.setError("Tracker update failed");}).finally(()=>{if(epoch===this.chatEpoch)update.disabled=this.helperBusy;});
        });update.disabled=this.helperBusy;group.append(update);
      }
    }
    parent.append(group);
  }
  private toggle(parent: HTMLElement, name: string, description: string, checked: boolean, update: (v: boolean) => unknown): void {
    const row = el("label", "lpt-setting"); const text = el("span", "lpt-setting-text");
    text.append(el("span", "lpt-setting-label", name), el("span", "lpt-setting-description", description));
    const input = el("input", "lpt-toggle"); input.type = "checkbox"; input.checked = checked;
    input.addEventListener("change", () => { void this.change({ settings: update(input.checked) }); }); row.append(text, input); parent.append(row);
  }
  private number(parent: HTMLElement, title: string, description: string, key: keyof Settings, min: number, max?: number): void {
    const row = el("label", "lpt-setting"); const text = el("span", "lpt-setting-text"); text.append(el("span", "lpt-setting-label", title), el("span", "lpt-setting-description", description));
    const input = el("input", "lpt-number"); input.type = "number"; input.min = String(min); input.step = "1"; if (max !== undefined) input.max = String(max); input.value = String(this.doc!.settings[key]);
    input.addEventListener("change", () => { if (input.reportValidity()) void this.change({ settings: { [key]: Number(input.value) } }); }); row.append(text, input); parent.append(row);
  }
}

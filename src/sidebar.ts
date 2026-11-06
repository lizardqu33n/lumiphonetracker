import {PersonalControls} from "./personal-controls";
import type {PersonalReply} from "./personal-settings";
import {UI_ICONS,type UIIconName} from "./ui-icons";
import { ALL_APPS, APP_FIELDS, type Document, type Settings } from "./model";
import { DESCRIPTIONS, appImage } from "./phone-view";
import type { Preferences } from "./preferences";
import type { ConnectionsInfo } from "./helper";
import { prepareCustomCSS } from "./custom-css";
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string) => { const n = document.createElement(tag); n.className = cls; if (text !== undefined)
    n.textContent = text; return n; };
export interface SidebarActions {
    personal?(change?:unknown,revision?:number):Promise<PersonalReply>;
    update(settings: unknown, revision: number): Promise<Document>;
    connections(): Promise<ConnectionsInfo>;
    css(text: string): Promise<Preferences>;
    applyCSS(text: string): void;
}
export class Sidebar {
    readonly root = node("div", "lpt-sidebar-settings");
    private doc: Document | null = null;
    private personal:PersonalControls;
    private name = "";
    private prefs: Preferences;
    private epoch = 0;
    private saving = false;
    private open = new Set(["apps"]);
    private cssOpen=false;
    private timer: ReturnType<typeof setTimeout> | undefined;
    private info: ConnectionsInfo = { available: false, choices: [], note: "Loading connections..." };
    private helperChoice = false;
    private status = node("p", "lpt-side-status");
    private cssText = "";
    constructor(parent: HTMLElement, private actions: SidebarActions, prefs: Preferences) { this.personal=new PersonalControls((change,revision)=>this.actions.personal?this.actions.personal(change,revision):Promise.reject(Error("Unavailable")));this.prefs = prefs; this.cssText = prefs.css; parent.append(this.root); this.personal.receive(null);this.render(); }
    receive(doc: Document | null, name: string): void {
        const changed = doc?.chatId !== this.doc?.chatId;
        if (this.doc?.settings.source === "helper" && doc?.settings.source === "main")
            this.helperChoice = false;
        this.doc = doc;
        this.personal.receive(doc);
        this.name = name;
        if (changed) {
            this.epoch++;
            this.saving = false;
            this.helperChoice = false;
            this.info = { available: false, choices: [], note: "Loading connections..." };
            if (doc)
                void this.connections();
        }
        this.render();
    }
    preferences(prefs: Preferences): void { this.prefs = prefs; this.cssText = prefs.css; const input = this.root.querySelector<HTMLTextAreaElement>(".lpt-sidebar-css"); if (input && document.activeElement !== input)
        input.value = prefs.css; }
    reset(): void { clearTimeout(this.timer); this.cssText = ""; const input = this.root.querySelector<HTMLTextAreaElement>(".lpt-sidebar-css"); if (input)
        input.value = ""; }
    destroy(): void { clearTimeout(this.timer); this.root.remove(); this.epoch++; }
    private async connections(): Promise<void> { const epoch = this.epoch; try {
        const info = await this.actions.connections();
        if (epoch !== this.epoch)
            return;
        this.info = info;
    }
    catch {
        if (epoch !== this.epoch)
            return;
        this.info = { available: false, choices: [], note: "Connections unavailable. Main AI still works." };
    } this.render(); }
    private async save(settings: unknown): Promise<void> { if (!this.doc || this.saving)
        return; const epoch = this.epoch, revision = this.doc.revision; this.saving = true; this.render(); try {
        const doc = await this.actions.update(settings, revision);
        if (epoch !== this.epoch)
            return;
        this.doc = doc;
        if (doc.settings.source === "main")
            this.helperChoice = false;
        this.status.textContent = "Saved.";
    }
    catch {
        if (epoch === this.epoch)
            this.status.textContent = "Could not save. Check this chat and try again.";
    }
    finally {
        if (epoch === this.epoch) {
            this.saving = false;
            const text = this.status.textContent;
            this.render();
            this.status.textContent = text;
        }
    } }
    private section(key: string, title: string, scope: string): HTMLElement {
        const details = node("details", `lpt-side-section lpt-side-${key}`);
        details.dataset.section = key;
        details.open = this.open.has(key);
        const summary=node("summary","lpt-side-summary");
        const icon=node("img","lpt-side-icon");icon.src=UI_ICONS[({apps:"apps",tracking:"track",source:"helper",appearance:"look",advanced:"advanced"} as Record<string,UIIconName>)[key]??"advanced"];icon.alt="";icon.setAttribute("aria-hidden","true");icon.draggable=false;
        summary.append(icon,node("span","lpt-side-heading",title),node("small","lpt-side-scope",scope));details.append(summary);
        details.addEventListener("toggle",()=>{if(!details.isConnected)return;if(details.open){this.open.clear();this.open.add(key);for(const other of Array.from(this.root.querySelectorAll<HTMLDetailsElement>(".lpt-side-section")))if(other!==details)other.open=false;}else this.open.delete(key);});
        this.root.append(details);
        return details;
    }
    private toggle(parent:HTMLElement,key:string,title:string,help:string,on:boolean,change:(on:boolean)=>unknown,compact=false):void {
        const origin=this.epoch,row=node("label",`lpt-side-setting${compact?" lpt-toggle-chip":" lpt-safety-setting"}`);row.dataset.setting=key;
        const input=node("input","lpt-side-checkbox");input.type="checkbox";input.setAttribute("role","switch");input.checked=on;input.setAttribute("aria-checked",String(on));input.disabled=this.saving||!this.doc;input.setAttribute("aria-label",title);
        const label=node("span","lpt-side-label");label.append(node("span","lpt-side-title",title));if(compact){row.title=help;input.title=help;}else label.append(node("small","lpt-side-help",help));
        input.addEventListener("change",()=>{input.setAttribute("aria-checked",String(input.checked));if(origin===this.epoch&&row.isConnected)void this.save(change(input.checked));});row.append(input,label);parent.append(row);
    }
    private number(parent: HTMLElement, key: keyof Settings, title: string, help: string, min: number, max?: number): void {
        const origin=this.epoch;
        const row = node("label", "lpt-side-setting");
        row.dataset.setting = key;
        const label = node("span", "lpt-side-label");
        label.append(node("span", "lpt-side-title", title));row.title=help;
        const input = node("input", "lpt-side-number");
        input.type = "number";
        input.min = String(min);
        input.step = "1";
        if (max)
            input.max = String(max);
        input.value = String(this.doc!.settings[key]);
        input.disabled = this.saving;
        input.setAttribute("aria-label", title);input.title=help;input.setAttribute("aria-description",help);
        input.addEventListener("change", () => { if (origin===this.epoch&&row.isConnected&&input.reportValidity())
            void this.save({ [key]: Number(input.value) }); });
        row.append(label, input);
        parent.append(row);
    }
    private render(): void {
        const origin=this.epoch;
        const active=document.activeElement;const selection=active instanceof HTMLTextAreaElement&&active.classList.contains("lpt-sidebar-css")&&this.root.contains(active)?{start:active.selectionStart,end:active.selectionEnd}:null;
        this.root.replaceChildren();
        this.root.append(node("p", "lpt-side-chat", this.doc ? `Settings for this chat: ${this.name || "Unnamed chat"}` : "Open a chat to change tracker settings"));
        const apps = this.section("apps", "App Store", "This chat");
        apps.append(node("p", "lpt-side-help", "Choose which apps are on the phone. Removing an app only hides it. Your data comes back when you add it again."));
        const grid=node("div","lpt-store-grid");apps.append(grid);
        for (const app of ALL_APPS) {
            const row = node("div", "lpt-store-row");
            row.dataset.storeApp = app;
            const image = node("span", "lpt-store-icon");
            image.append(appImage(app));
            const label = node("div", "lpt-side-label");
            label.append(node("strong", "lpt-store-name", app));
            const added = this.doc?.settings.apps[app] === true;
            row.title=DESCRIPTIONS[app];
            const button = node("button", "lpt-store-button", added ? "Remove" : "Add");
            button.type = "button";button.title=DESCRIPTIONS[app];button.setAttribute("aria-description",DESCRIPTIONS[app]);
            button.disabled = !this.doc || this.saving;
            button.setAttribute("aria-label", `${added ? "Remove" : "Add"} ${app}`);
            button.addEventListener("click", () => { if(origin===this.epoch&&row.isConnected)void this.save({ apps: { [app]: !added } }); });
            row.append(image, label, button);
            grid.append(row);
        }
        const track = this.section("tracking", "What to track", "This chat");
        if (this.doc) {
            if(!ALL_APPS.some(a=>this.doc!.settings.apps[a]))track.append(node("p","lpt-side-help","Add an app in App Store to choose what it tracks."));
            for (const app of ALL_APPS.filter(a=>this.doc!.settings.apps[a])) {
                const group = node("fieldset", "lpt-side-group");
                group.append(node("legend", "lpt-side-legend", app));
                for (const key of APP_FIELDS[app]) {
                    const field = key.split(".").at(-1)!;
                    const titles: Record<string, string> = { location: "Location", time: "Time", date: "Date", present: "Who is present", roles: "Roles", physical: "Physical status", mood: "Mood", position: "Position", attire: "Attire", thoughts: "Inner thoughts", people: "People", items: "Key items", rules: "Rules", plots: "Plots", misc: "Misc", locations: "Locations", weather: "Weather", messages: "Messages",calls:"Calls",email:"Email",balance:"Balance",transactions:"Transactions" };
                    const hints: Record<string, string> = { location: "Exact place and wider area.", time: "Established story time.", date: "Established story date.", present: "Everyone present, by name.", roles: "Known roles and affiliations.", physical: "Observable physical condition.", mood: "Established mood, NPCs only.", position: "Known facing and relative position.", attire: "Worn and recently removed items.", thoughts: "Short private thoughts, NPCs only.", people: "People with a reason to return.", items: "Only items with a specific story function.", rules: "Stated principles or restrictions.", plots: "Promises, meetings and pending events.", misc: "Your own notes; you choose what the AI sees.", locations: "Meaningful places and known details.", weather: "Only weather established in the story.", messages: "Texts actually sent in the story.",calls:"Calls established in the story.",email:"Emails actually sent in the story.",balance:"Only the last stated balance; never calculated.",transactions:"Only stated transactions; never adjusts a balance." };
                    this.toggle(group, key, titles[field], hints[field], this.doc.settings.enabled[key], on => ({ enabled: { [key]: on } }),true);
                }
                track.append(group);
            }
        }
        const source = this.section("source", "Helper AI", "This chat");
        if (this.doc) {
            const label = node("label", "lpt-side-label", "Who updates the tracker");
            const select = node("select", "lpt-helper-source");
            for (const [value, title] of [["main", "Main AI"], ["helper", "Helper AI"]]) {
                const o = node("option", "", title);
                o.value = value;
                select.append(o);
            }
            select.value = this.doc.settings.source === "helper" || this.helperChoice ? "helper" : "main";
            select.disabled = this.saving;
            select.addEventListener("change", () => {
                if(origin!==this.epoch||!select.isConnected)return; this.helperChoice = select.value === "helper"; if (!this.helperChoice)
                void this.save({ source: "main" });
            else if (this.doc!.settings.connection_id && this.info.available)
                void this.save({ source: "helper" });
            else
                this.render(); });
            label.append(select);
            source.append(label);
            if (select.value === "helper") {
                const label = node("label", "lpt-side-label", "Connection");
                const connection = node("select", "lpt-helper-connection");
                const empty = node("option", "", "Choose a connection");
                empty.value = "";
                connection.append(empty);
                for (const c of this.info.choices) {
                    const o = node("option", "", c.label);
                    o.value = c.id;
                    connection.append(o);
                }
                connection.value = this.doc.settings.connection_id ?? "";
                connection.disabled = !this.info.available || this.saving;
                connection.addEventListener("change", () => { if (origin===this.epoch&&connection.isConnected&&connection.value)
                    void this.save({ source: "helper", connection_id: connection.value }); });
                label.append(connection);
                source.append(label, node("p", "lpt-side-help", this.info.note));
                this.number(source, "helperMessages", "Messages to read", "Only recent messages and the compact tracker are sent.", 1, 10);
                source.append(node("p", "lpt-side-help", "Requests may cost money depending on the model chosen."));
            }
        }
        const appearance = this.section("appearance", "Appearance", "All my chats");
        const label = node("label", "lpt-side-label");
        const input = node("textarea", "lpt-sidebar-css");
        input.value = this.cssText;
        input.maxLength = 32000;
        input.spellcheck = false;
        input.setAttribute("aria-label", "Custom CSS");
        label.append(input);
        const cssFold=node("details","lpt-side-css-collapse");cssFold.open=this.cssOpen||selection!==null;cssFold.append(node("summary","lpt-side-css-summary","Custom CSS"),label);cssFold.addEventListener("toggle",()=>{if(cssFold.isConnected)this.cssOpen=cssFold.open;});
        appearance.append(cssFold, node("p", "lpt-side-help", "Applies live to the phone only. Reset appearance above restores the default look."));
        input.addEventListener("input", () => { clearTimeout(this.timer); this.cssText = input.value; try {
            prepareCustomCSS(input.value);
            this.actions.applyCSS(input.value);
            this.status.textContent = "";
            const text = input.value;
            this.timer = setTimeout(() => { void this.actions.css(text).then(p => { this.prefs = p; this.status.textContent = "Appearance saved."; }).catch(() => { this.status.textContent = "Appearance could not be saved."; }); }, 400);
        }
        catch (e) {
            this.status.textContent = e instanceof Error ? e.message : "Check the CSS.";
        } });
        const presets=this.section("presets","Presets","All my chats");presets.append(this.personal.presets);
        const advanced = this.section("advanced", "Advanced", "This chat");
        if (this.doc) {
            const numbers=node("div","lpt-side-numbers");advanced.append(numbers);
            this.number(numbers, "notesPerSection", "Notes per section", "Existing notes stay when you lower the limit.", 3, 30);
            this.number(numbers, "logLines", "Log lines sent to the AI", "The phone still shows all notes.", 1);
            this.number(numbers, "keepTrackers", "Keep tracker blocks in the last N messages", "0 uses continuity summaries only.", 0);
            this.number(numbers, "keepTexts", "Recent messages to keep texts from", "Older text tags stay out of prompt history.", 1);
            this.toggle(advanced, "aiPlayerTexts", "Let the AI write texts, calls and emails for my character", "Off by default. Your own established messages and calls still count.", this.doc.settings.aiPlayerTexts, on => ({ aiPlayerTexts: on }));
            this.toggle(advanced, "inferMissing", "Let the AI fill in missing details", "Off by default. New inferred contact values are marked.", this.doc.settings.inferMissing, on => ({ inferMissing: on }));
        }
        advanced.append(this.personal.wording);
        this.status.setAttribute("role", "status");
        this.status.setAttribute("aria-live", "polite");
        this.root.append(this.status);
        if(selection){input.focus({preventScroll:true});input.setSelectionRange(selection.start,selection.end);}
    }
}

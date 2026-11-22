import {resolveSetup} from "./setup-review";
import {fieldKey,readFieldRef,restoreEdit,legacyEditAdmissions} from "./field-protection";
import {mergeContacts,canonicalContact} from "./contact-merge";
import {setupCandidates,type SetupData} from "./setup-wizard";
import {readContactInfo,emptyContactInfo,projectContacts,contactDuplicates} from "./contact-info";
import {portraitBytes,portraitKey,PORTRAIT_CHAT_LIMIT} from "./portraits";
import {callId} from "./calls";
import { validateEmail,validateActivity } from "./activity";
import { isHelperNotice } from "./helper-status";
import { isRecord } from "./shared";
import { chatPath } from "./store";
import { effectiveDocument, CONTACT_KEYS, emptyDocument, emptyState, readSettings, SECTIONS, normalize, type Document, type ManualEdit, type HelperEntry, type Section } from "./model";
import { applyManual, replay, rowSignature, helperSourceSignature, type StoryRow } from "./engine";
import { validateExpanded, short } from "./schema";
import { readSnapshot } from "./history";
import { SkipLogger } from "./diagnostics";

export const DOCUMENT_KEY = "lpt_phone_v2";
export interface PhoneIO {
  authorize(chatId: string, userId: string): Promise<boolean>;
  read(chatId: string): Promise<string>;
  write(chatId: string, data: string): Promise<void>;
  history(chatId: string): Promise<StoryRow[]>;
  player(chatId: string, userId: string): Promise<string | null>;
  legacy?(userId: string, path: string): Promise<unknown>;
  names?(chatId:string,userId:string):Promise<string[]>;
  warn?(text: string): void;
}
export function readDocument(raw: string, chatId: string): Document {
  if (!raw) return emptyDocument(chatId);
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value) || value.schema !== 2 || value.chatId !== chatId || !Number.isSafeInteger(value.revision) ||
    !Array.isArray(value.accepted) || !Array.isArray(value.edits)) throw new Error("Invalid saved data");
  const doc = emptyDocument(chatId); doc.revision = value.revision as number;
  if(value.checkpoint!==undefined){const c=value.checkpoint;if(!isRecord(c)||c.version!==1||typeof c.id!=="string"||!Number.isInteger(c.index)||typeof c.signature!=="string")throw Error("Invalid checkpoint");if(c.lastUser!==undefined){const u=c.lastUser;if(!isRecord(u)||u.chat_id!==chatId||u.role!=="user"||typeof u.id!=="string"||typeof u.content!=="string"||!Number.isInteger(u.index_in_chat)||Number(u.index_in_chat)>Number(c.index)||!Number.isInteger(u.swipe_id))throw Error("Invalid checkpoint source");}doc.checkpoint=c as unknown as Document["checkpoint"];}
  if(value.trackingEnabled!==undefined){if(typeof value.trackingEnabled!=="boolean")throw Error("Invalid tracking state");doc.trackingEnabled=value.trackingEnabled;}
  if (value.rejected !== undefined && (!Array.isArray(value.rejected) || value.rejected.some(x => typeof x !== "string"))) throw new Error("Invalid rejection data");
  if(value.contactInfo!==undefined){if(!isRecord(value.contactInfo))throw Error("Invalid contact details");doc.contactInfo=Object.create(null);for(const [key,raw]of Object.entries(value.contactInfo)){if(!isRecord(raw)||typeof raw.name!=="string"||normalize(raw.name)!==key)throw Error("Invalid contact details");doc.contactInfo![key]=readContactInfo(raw,raw.name);}}
  doc.rejected = value.rejected as string[] ?? [];
  for (const key of ["notices", "inferences"] as const) {
    if (value[key] !== undefined && (!Array.isArray(value[key]) || (value[key] as unknown[]).some(x => typeof x !== "string"))) throw new Error("Invalid saved metadata");
    doc[key] = value[key] as string[] ?? [];
  }
  if(value.portraits!==undefined){if(!isRecord(value.portraits))throw Error("Invalid portraits");doc.portraits=Object.create(null) as Record<string,string>;for(const [name,data]of Object.entries(value.portraits)){portraitBytes(data);doc.portraits[name]=data as string;}if(Object.values(doc.portraits).reduce((sum,v)=>sum+v.length,0)>PORTRAIT_CHAT_LIMIT)throw Error("Portrait storage is full.");}
  if(value.userEditAdmissions!==undefined){if(!Array.isArray(value.userEditAdmissions)||value.userEditAdmissions.some(x=>typeof x!=="string"))throw Error("Invalid edit admissions");doc.userEditAdmissions=value.userEditAdmissions;}
  if(value.fieldLocks!==undefined){if(!isRecord(value.fieldLocks))throw Error("Invalid field locks");doc.fieldLocks={};for(const [key,on]of Object.entries(value.fieldLocks)){if(typeof on!=="boolean")throw Error("Invalid field lock");const [target,name,section,field]=JSON.parse(key);const r=readFieldRef({target,name:name||undefined,section,field});doc.fieldLocks[fieldKey(r)]=on;}}
  if(value.contactMerges!==undefined){if(!isRecord(value.contactMerges)||Object.keys(value.contactMerges).length>100)throw Error("Invalid merged contacts");doc.contactMerges={};for(const [key,m]of Object.entries(value.contactMerges)){if(!isRecord(m)||typeof m.from!=="string"||typeof m.into!=="string"||normalize(m.from)!==key||normalize(m.from)===normalize(m.into)||!(m.after===null||typeof m.after==="string")||!Number.isInteger(m.index))throw Error("Invalid merged contacts");doc.contactMerges[key]=m as unknown as NonNullable<Document["contactMerges"]>[string];}}if(value.mergeArchive!==undefined){if(!Array.isArray(value.mergeArchive)||value.mergeArchive.length>100)throw Error("Invalid merge history");doc.mergeArchive=value.mergeArchive;}
  doc.settings = readSettings(value.settings); doc.legacy = value.legacy;
  if (value.helperOwner !== undefined && (typeof value.helperOwner !== "string" || !value.helperOwner)) throw new Error("Invalid helper owner");
  doc.helperOwner = value.helperOwner as string | undefined;
  if (value.helperAttempts !== undefined && (!Array.isArray(value.helperAttempts) || value.helperAttempts.some(s => typeof s !== "string" || s.length > 1000))) throw new Error("Invalid helper attempts");
  doc.helperAttempts = value.helperAttempts as string[] ?? [];
  if (value.helperEntries !== undefined && !Array.isArray(value.helperEntries)) throw new Error("Invalid helper entries");
  for (const entry of value.helperEntries as unknown[] ?? []) {
    if (!isRecord(entry) || typeof entry.id !== "string" || !isRecord(entry.at) || typeof entry.at.id !== "string" || !Number.isInteger(entry.at.index) || typeof entry.at.variant !== "string" ||
      !Array.isArray(entry.sources) || entry.sources.length < 1 || entry.sources.length > 10 || entry.sources.some(s => !isRecord(s) || typeof s.id !== "string" || typeof s.signature !== "string") ||
      !isRecord(entry.values) || typeof entry.prose !== "string") throw new Error("Invalid helper entry");
    validateExpanded(entry.values); doc.helperEntries.push(entry as unknown as HelperEntry);
  }
  for (const rawEdit of value.edits) doc.edits.push(validateEdit(rawEdit));
  for (const entry of value.accepted) {
    if (!isRecord(entry) || !isRecord(entry.at) || typeof entry.at.id !== "string" || !Number.isInteger(entry.at.index) ||
      typeof entry.at.variant !== "string" || !isRecord(entry.patch) || !isRecord(entry.patch.scene) ||
      !Array.isArray(entry.patch.contacts) || !isRecord(entry.patch.notes) || !Array.isArray(entry.texts) ||
      typeof entry.prose !== "string" || !["user", "assistant"].includes(String(entry.role))) throw new Error("Invalid saved source");
    const rawPatch = { ...entry.patch.scene, ...(isRecord(entry.patch.weatherDetails)?entry.patch.weatherDetails:{}), ...(entry.patch.weather ? { weather: entry.patch.weather } : {}),
      calls:entry.patch.calls,bank:entry.patch.bank,transactions:entry.patch.transactions,
      contacts: entry.patch.contacts.map(c => {
        if (!isRecord(c) || !isRecord(c.fields)) throw new Error("Invalid saved contact");
        return { name: c.name, ...c.fields };
      }), locations: entry.patch.locations, ...entry.patch.notes };
    const patch = validateExpanded(rawPatch);
    for (const text of entry.texts) if (!isRecord(text) || !short(text.from, 100) || typeof text.text !== "string" || text.text.length > 3000 ||
      (text.to !== undefined && !short(text.to, 100)) || (text.group !== undefined && !short(text.group,100)) || (text.time !== undefined && !short(text.time, 100))) throw new Error("Invalid saved text");
    if(entry.emails!==undefined&&!Array.isArray(entry.emails))throw Error("Invalid saved emails");
    const emails=Array.isArray(entry.emails)?entry.emails.map(validateEmail):[];
    if(entry.bankProof!==undefined&&!Array.isArray(entry.bankProof))throw Error("Invalid bank proof");
    const bankProof=(entry.bankProof as unknown[]??[]).map(v=>validateActivity("bank",v)) as import("./model").BankData[];
    doc.accepted.push({ bankProof,emails,at: entry.at as unknown as Document["accepted"][number]["at"], patch,
      texts: entry.texts as Document["accepted"][number]["texts"], role: entry.role as "assistant" | "user",
      ...(typeof entry.name === "string" ? { name: entry.name } : {}), prose: "" });
  }
  doc.rejected=doc.rejected.map(key=>{try{const parts:unknown=JSON.parse(key);if(Array.isArray(parts)&&parts[0]==="activity"&&parts[1]==="calls"&&typeof parts[2]==="string"){const id:unknown=JSON.parse(parts[2]);if(Array.isArray(id)&&typeof id[0]==="string"&&id[2]==="calls"){const call=validateActivity("calls",parts[3]) as import("./model").CallData;return JSON.stringify(["activity","calls",callId(id[0],call),call]);}}}catch{}return key;});
  // Cache only admitted identities, never story values. Reserve existing slots during source-ID migration.
  const aliases=new Map<string,string>();
  for(const e of doc.accepted)for(const [i,c]of (e.patch.calls??[]).entries())aliases.set(JSON.stringify([e.at.id,e.at.variant,"calls",i]),callId(e.at.id,c));
  for(const e of doc.helperEntries)for(const [i,c]of (validateExpanded(e.values).calls??[]).entries())aliases.set(JSON.stringify([e.at.id,e.at.variant,"calls",i]),callId(c.source??e.at.id,c));
  if(isRecord(value.state)&&Array.isArray(value.state.calls))doc.callAdmissions=value.state.calls.flatMap(c=>isRecord(c)&&typeof c.id==="string"?[aliases.get(c.id)??c.id]:[]).slice(0,30);
  // Only validated admission names are read from the cached state. All values are replayed.
  if (isRecord(value.state) && isRecord(value.state.notes)) for (const section of SECTIONS) {
    const notes = value.state.notes[section]; if (!Array.isArray(notes)) continue;
    for (const n of notes) if (isRecord(n) && short(n.name, 100)) doc.state.notes[section].push({
      name: n.name, detail: "", context: "", resolved: false, sendToAI: false,
      by: "ai", addedByUser: false, updated: false, at: { id: "admission", index: -1, variant: "" },
    });
  }
  if(isRecord(value.settings)&&value.settings.allowAIUserEdits===undefined)doc.userEditAdmissions=legacyEditAdmissions(doc,doc.helperEntries.map(e=>({patch:validateExpanded(e.values),at:e.at})));
  return doc;
}
export function validateEdit(value: unknown): ManualEdit {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id ||
    !(value.after === null || typeof value.after === "string") || !Number.isInteger(value.index) || (value.index as number) < -1 ||
    !["scene", "weather", "contact", "location", "note","call","email","bank","transaction"].includes(String(value.target)) ||
    (value.remove !== undefined && typeof value.remove !== "boolean")||(value.playerWritingAllowed!==undefined&&typeof value.playerWritingAllowed!=="boolean")||(value.playerAtEdit!==undefined&&typeof value.playerAtEdit!=="boolean")) throw new Error("Invalid edit");
  if(value.source!==undefined&&!["setup","merge","lock"].includes(String(value.source)))throw Error("Invalid edit source");if(value.editedFields!==undefined&&(!Array.isArray(value.editedFields)||value.editedFields.some(f=>typeof f!=="string")))throw Error("Invalid edited fields");
  const edit = value as unknown as ManualEdit;
  applyManual(emptyState(), edit, new Set(), new Set(),true);
  return structuredClone(edit);
}
export class PhoneStore {
  private ready=new Set<string>();
  private markReady(chat:string):void{this.ready.delete(chat);this.ready.add(chat);while(this.ready.size>128)this.ready.delete(this.ready.values().next().value!);}
  async openView(chat:string,user:string):Promise<Document>{if(this.ready.has(chat)){const doc=await this.savedView(chat,user);if(this.ready.has(chat))return doc;}return this.sync(user,chat);}
  private queues = new Map<string, Promise<unknown>>();
  private pendingReads=new Map<string,{task:Promise<Document>;started:boolean;persist:boolean}>();
  private readOperation(kind:"sync"|"preview",userId:string,chatId:string):Promise<Document> {
    const key=JSON.stringify([userId,chatId]);
    const prior=this.pendingReads.get(key);
    if(prior&&!prior.started&&this.queues.get(chatId)===prior.task){prior.persist ||= kind==="sync";return prior.task.then(doc=>structuredClone(doc));}
    const entry={started:false,persist:kind==="sync",task:undefined as unknown as Promise<Document>};
    entry.task=this.serial(chatId,async()=>{
      entry.started=true;
      if(!userId||!await this.io.authorize(chatId,userId))throw Error("Chat unavailable");
      const {doc}=await this.build(chatId,userId);
      if(entry.persist&&doc.trackingEnabled!==false){
        const raw=await this.io.read(chatId);
        const comparable={...doc,revision:raw?JSON.parse(raw).revision:0};
        if(!raw||JSON.stringify(comparable,canonicalKeys)!==JSON.stringify(JSON.parse(raw),canonicalKeys)){doc.revision=comparable.revision+1;await this.io.write(chatId,JSON.stringify(doc));}
      }
      if(entry.persist&&doc.trackingEnabled!==false)this.markReady(chatId);
      return doc;
    });
    this.pendingReads.set(key,entry);
    const cleanup=()=>{if(this.pendingReads.get(key)===entry)this.pendingReads.delete(key);};
    void entry.task.then(cleanup,cleanup);
    return entry.task.then(doc=>structuredClone(doc));
  }
  private replayCache?:{key:string;doc:Document;bytes:number};
  private skips: SkipLogger;
  constructor(private io: PhoneIO) { this.skips = new SkipLogger(text => this.io.warn?.(text)); }
  private serial<T>(chatId: string, action: () => Promise<T>): Promise<T> {
    const task = (this.queues.get(chatId) ?? Promise.resolve()).catch(() => {}).then(action);
    this.queues.set(chatId, task);
    const cleanup = () => { if (this.queues.get(chatId) === task) this.queues.delete(chatId); };
    void task.then(cleanup, cleanup); return task;
  }
  private async build(chatId: string, userId: string,check:()=>void=()=>{}): Promise<{ doc: Document; rows: StoryRow[] }> {
    if (!chatId || chatId.length > 256) throw new Error("Missing chat");
    check();const raw = await this.io.read(chatId);check();
    const legacy=!raw&&this.io.legacy?await this.io.legacy(userId,chatPath(chatId)):null;
    check();if((!raw&&!legacy)||(raw&&JSON.parse(raw).trackingEnabled===false)){const value=raw?JSON.parse(raw):null;const doc=emptyDocument(chatId);if(value){if(value.schema!==2||value.chatId!==chatId||!Number.isSafeInteger(value.revision)||value.revision<0)throw Error("Invalid saved data");doc.revision=value.revision;doc.settings=readSettings(value.settings);}doc.trackingEnabled=false;return {doc,rows:[]};}
    const rows = await this.io.history(chatId);check();
    const player = await this.io.player(chatId, userId);check();
    const names=await this.io.names?.(chatId,userId)??[];
    check();
    // Validate every input afresh. There is no time-based or timestamp-only cache hit.
    const proof=JSON.stringify([chatId,userId,raw,rows.map(rowSignature),player,names,legacy]);
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(proof));
    check();const key=Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,"0")).join("");
    if(this.replayCache?.key===key)return {doc:structuredClone(this.replayCache.doc),rows};
    let doc = readDocument(raw, chatId);
    if (!raw && legacy !== null) {
      const old = readSnapshot(legacy, chatId); doc.legacy = legacy;
      doc.accepted = old.entries.map(e => {
        const p = e.patch;
        const patch = validateExpanded({ location: p.location, time: p.time, present: p.present, weather: p.weather });
        return { at: { id: e.source.messageId, index: e.source.index, variant: e.source.variant },
          patch, texts: e.texts, role: "assistant", prose: "" };
      });
    }
    doc = replay(doc, rows, player ? [player] : [], (row, issues) => this.skips.record(chatId, row, issues));
    doc.currentPlayer = player ?? undefined;
    projectContacts(doc,names);
    const last=[...rows].sort((a,b)=>a.index_in_chat-b.index_in_chat).at(-1);
    if(last)doc.checkpoint={version:1,id:last.id,index:last.index_in_chat,signature:await sourceHash(last),lastUser:[...rows].reverse().find(r=>r.role==="user")};
    // One entry, at most 2 MiB of serialized data. Large portrait-heavy chats skip reuse.
    const bytes=new TextEncoder().encode(JSON.stringify(doc)).byteLength;
    this.replayCache=bytes<=2*1024*1024?{key,doc:structuredClone(doc),bytes}:undefined;
    return { doc, rows };
  }
  /** Read only stored settings for routing, without fetching or replaying story history. */
  trackingSource(userId:string,chatId:string):Promise<{source:"main"|"helper";owner?:string}> {
    return this.serial(chatId,async()=>{
      if(!userId||!await this.io.authorize(chatId,userId))throw Error("Chat unavailable");
      const raw=await this.io.read(chatId);
      if(!raw)return {source:"main"};
      const value:unknown=JSON.parse(raw);
      if(!isRecord(value)||value.schema!==2||value.chatId!==chatId)throw Error("Invalid saved data");
      const settings=readSettings(value.settings);
      return {source:value.trackingEnabled===false?"main":settings.source,...(typeof value.helperOwner==="string"?{owner:value.helperOwner}:{})};
    });
  }
  /** Read-only preview with a trusted user and an authorized chat. Never writes. */
  preview(chatId:string,userId:string):Promise<Document>{return this.readOperation("preview",userId,chatId);}
  sync(userId:string,chatId:string):Promise<Document>{return this.readOperation("sync",userId,chatId);}
  savedView(chatId:string,userId:string):Promise<Document>{
    if(!this.ready.has(chatId))return this.preview(chatId,userId);
    return this.serial(chatId,async()=>{
      if(!userId||!await this.io.authorize(chatId,userId))throw Error("Chat unavailable");
      const raw=await this.io.read(chatId),doc=materialized(raw,chatId);
      if(!doc){this.ready.delete(chatId);return (await this.build(chatId,userId)).doc;}
      doc.settings.source="main";
      const player=await this.io.player(chatId,userId);doc.currentPlayer=player??undefined;
      if(player&&!doc.playerNames.some(n=>normalize(n)===normalize(player)))doc.playerNames.push(player);
      for(const contact of doc.state.contacts)if(doc.playerNames.some(n=>normalize(n)===normalize(contact.name))){contact.player=true;delete contact.fields.roles;delete contact.fields.mood;delete contact.fields.thoughts;}
      return doc;
    });
  }
  /** Called only for a trusted saved-message event, never frontend-supplied content. */
  receiveSaved(userId:string,chatId:string,row:StoryRow):Promise<Document>{
    return this.serial(chatId,async()=>{
      if(!userId||!await this.io.authorize(chatId,userId))throw Error("Chat unavailable");
      if(row.chat_id!==chatId||!row.id||!Number.isSafeInteger(row.index_in_chat)||typeof row.content!=="string")throw Error("Invalid saved message");
      const raw=await this.io.read(chatId),doc=materialized(raw,chatId),signature=await sourceHash(row);
      if(doc?.trackingEnabled===false)return doc;
      if(this.ready.has(chatId)&&doc?.checkpoint?.id===row.id&&doc.checkpoint.signature===signature)return doc;
      const safe=this.ready.has(chatId)&&doc?.checkpoint&&row.index_in_chat===doc.checkpoint.index+1&&!doc.accepted.some(e=>e.at.id===row.id)&&doc.edits.every(e=>!e.remove&&!e.rename&&!["call","email","bank","transaction"].includes(e.target))&&!Object.keys(doc.contactMerges??{}).length&&!row.content.includes("notes=")&&!row.content.includes("details=");
      let next:Document;
      if(safe){
        const player=await this.io.player(chatId,userId),players=[...doc!.playerNames,...(player?[player]:[])];
        if(normalize(player??"")!==normalize(doc!.currentPlayer??""))next=(await this.build(chatId,userId)).doc;else {next=replay(doc!,[row],players,(r,issues)=>this.skips.record(chatId,r,issues),{lastUser:doc!.checkpoint!.lastUser});
        next.currentPlayer=player??undefined;projectContacts(next,await this.io.names?.(chatId,userId)??[]);
        next.checkpoint={version:1,id:row.id,index:row.index_in_chat,signature,lastUser:row.role==="user"?row:doc!.checkpoint!.lastUser};}
      }else next=(await this.build(chatId,userId)).doc;
      if(next.trackingEnabled===false)return next;
      next.settings.source="main";next.revision=(raw?JSON.parse(raw).revision:0)+1;
      await this.io.write(chatId,JSON.stringify(next));this.markReady(chatId);this.replayCache=undefined;return next;
    });
  }
  /** A cancelled queued prompt must never begin history work. */
  promptPreview(chatId:string,userId:string,signal:AbortSignal):Promise<Document>{
    return this.serial(chatId,async()=>{const check=()=>signal.throwIfAborted();check();if(!userId||!await this.io.authorize(chatId,userId))throw Error("Chat unavailable");check();if(this.ready.has(chatId)){const raw=await this.io.read(chatId);check();const saved=materialized(raw,chatId);if(saved)return saved;}return (await this.build(chatId,userId,check)).doc;});
  }
  /** Authorized routing/settings only: no history, persona expansion or replay. */
  settingsPreview(userId:string,chatId:string,signal?:AbortSignal):Promise<Document>{
    return this.serial(chatId,async()=>{
      signal?.throwIfAborted();if(!userId||!await this.io.authorize(chatId,userId))throw Error("Chat unavailable");
      signal?.throwIfAborted();const raw=await this.io.read(chatId),doc=emptyDocument(chatId);signal?.throwIfAborted();
      if(!raw){doc.trackingEnabled=false;return doc;}
      const value:unknown=JSON.parse(raw);
      if(!isRecord(value)||value.schema!==2||value.chatId!==chatId||!Number.isSafeInteger(value.revision)||Number(value.revision)<0||value.trackingEnabled!==undefined&&typeof value.trackingEnabled!=="boolean")throw Error("Invalid saved data");
      doc.settings=readSettings(value.settings);doc.revision=Number(value.revision);doc.trackingEnabled=value.trackingEnabled as boolean|undefined;
      if(typeof value.helperOwner==="string")doc.helperOwner=value.helperOwner;
      return doc;
    });
  }
  /** Step 4's controls will use this same validated, chat-authorized operation. */
  update(userId: string, chatId: string, expectedRevision: number, update: { trackingEnabled?:unknown; settings?: unknown; edit?: unknown; dismissNotice?: unknown;portrait?:unknown;contactInfo?:unknown;fieldControl?:unknown;mergeContacts?:unknown }): Promise<Document> {
    return this.serial(chatId, async () => {
      if (!userId || !(await this.io.authorize(chatId, userId))) throw new Error("Chat unavailable");
      const raw = await this.io.read(chatId); const saved = readDocument(raw, chatId);
      if (saved.revision !== expectedRevision) throw new Error("The tracker changed. Reopen it and try again.");
      if(update.trackingEnabled!==undefined){
        if(typeof update.trackingEnabled!=="boolean"||Object.keys(update).some(k=>k!=="trackingEnabled"&&update[k as keyof typeof update]!==undefined))throw Error("Invalid tracking state");
        const next={...(raw?JSON.parse(raw):saved),trackingEnabled:update.trackingEnabled,revision:saved.revision+1};await this.io.write(chatId,JSON.stringify(next));this.replayCache=undefined;return {...saved,trackingEnabled:next.trackingEnabled,revision:next.revision};
      }
      let { doc, rows } = await this.build(chatId, userId);
      if(doc.trackingEnabled===false)throw Error("Turn on the tracker for this chat first.");
      if (JSON.stringify(doc.accepted,canonicalKeys) !== JSON.stringify(saved.accepted,canonicalKeys) && raw) throw new Error("The story changed. Reopen the tracker and try again.");
      if (update.settings !== undefined) {
        if (!isRecord(update.settings)) throw new Error("Invalid settings");
        if(update.settings.apps!==undefined&&!isRecord(update.settings.apps))throw new Error("Invalid apps");
        const enabled = update.settings.enabled;
        if (enabled !== undefined && !isRecord(enabled)) throw new Error("Invalid switches");

        doc.settings = readSettings({ ...doc.settings, ...update.settings,
          apps: { ...doc.settings.apps, ...(isRecord(update.settings.apps)?update.settings.apps:{}) },
          enabled: { ...doc.settings.enabled, ...(isRecord(enabled) ? enabled : {}) } });
        if (update.settings.source === "helper") doc.helperOwner = userId;
      }
      if (update.dismissNotice !== undefined) {
        if (typeof update.dismissNotice !== "string") throw new Error("Invalid notice");
        doc.notices = doc.notices.filter(n => n !== update.dismissNotice);
      }
      if(update.fieldControl!==undefined){const control=update.fieldControl;if(!isRecord(control)||!["lock","unlock","restore"].includes(String(control.action)))throw Error("Invalid field control");const r=readFieldRef(control);if(control.action==="restore")update={...update,edit:restoreEdit(doc,r)};else{(doc.fieldLocks??={})[fieldKey(r)]=control.action==="lock";if(control.action==="lock"){try{update={...update,edit:{...restoreEdit(doc,r,true),source:"lock"}};}catch{/* An empty field can be locked without manufacturing a value. */}}}}
      if(update.mergeContacts!==undefined){const m=update.mergeContacts;if(!isRecord(m)||m.confirm!==true||typeof m.from!=="string"||typeof m.into!=="string")throw Error("Confirm a merge first.");const last=rows.at(-1);mergeContacts(doc,m.from,m.into,last?.id??null,last?.index_in_chat??-1);}
      if (update.edit !== undefined) {
        const input = isRecord(update.edit) ? update.edit : {};
        if(input.target==="contact"&&typeof input.name==="string"&&!doc.state.contacts.some(c=>normalize(c.name)===normalize(input.name as string))&&doc.contactMerges?.[normalize(input.name)])throw Error("That name is a merged alias. Use a different full name.");
        // Anchor/revision/identity come from the saved history, never from UI claims.
        const last = [...rows].sort((a, b) => a.index_in_chat - b.index_in_chat).at(-1);
        const edit = validateEdit({ ...input,source:isRecord(update.fieldControl)&&update.fieldControl.action==="lock"?"lock":undefined,editedFields:isRecord(update.fieldControl)?input.editedFields:undefined,...(input.target==="contact"?{playerAtEdit:doc.state.contacts.some(c=>c.player&&[input.name,input.rename].some(n=>typeof n==="string"&&normalize(n)===normalize(c.name)))}:{}),playerWritingAllowed:doc.settings.aiPlayerTexts, id: crypto.randomUUID(), after: last?.id ?? null, index: last?.index_in_chat ?? -1 });
        if (edit.target === "note" && edit.section && !edit.remove) {
          const notes = doc.state.notes[edit.section];
          const existing = notes.some(n => normalize(n.name) === normalize(edit.name ?? ""));
          const resolved = edit.section === "plots" && isRecord(edit.value) && edit.value.resolved === true;
          if (!existing && !resolved && notes.filter(n => !n.resolved).length >= doc.settings.notesPerSection) throw new Error("This section is full. Delete a note to make room.");
        }
        if(edit.target==="contact"&&isRecord(edit.value)&&doc.state.contacts.some(c=>c.player&&[edit.name,edit.rename].some(n=>typeof n==="string"&&normalize(n)===normalize(c.name)))&&Object.keys(edit.value).some(k=>!["physical","position","attire"].includes(k)))throw Error("Invalid player/contact field");
        if(edit.target==="contact"&&edit.remove)for(const m of Object.values(doc.contactMerges??{}))if(normalize(canonicalContact(doc,m.from))===normalize(edit.name??""))doc.edits.push({...edit,id:crypto.randomUUID(),name:m.from});
        if(edit.rename&&edit.name)for(const [key,on]of Object.entries(doc.fieldLocks??{})){const [target,name,section,field]=JSON.parse(key);if(target===edit.target&&name===normalize(edit.name)&&(target!=="note"||section===edit.section)){doc.fieldLocks![fieldKey({target,name:edit.rename,section,field})]=on;delete doc.fieldLocks![key];}}
        doc.edits.push(edit);
      }
      if(isRecord(update.edit)&&update.edit.target==="contact"&&typeof update.edit.name==="string"&&doc.contactInfo){const key=normalize(update.edit.name);if(update.edit.remove)delete doc.contactInfo[key];else if(typeof update.edit.rename==="string"&&doc.contactInfo[key]){doc.contactInfo[normalize(update.edit.rename)]={...doc.contactInfo[key],name:update.edit.rename};if(normalize(update.edit.rename)!==key)delete doc.contactInfo[key];}}
      if(update.contactInfo!==undefined){const input=update.contactInfo;if(!isRecord(input)||typeof input.name!=="string")throw Error("Invalid contact details");const name=input.name;const creating=isRecord(update.edit)&&update.edit.target==="contact"&&!update.edit.remove&&[update.edit.name,update.edit.rename].includes(name);if(!creating&&!doc.state.contacts.some(c=>normalize(c.name)===normalize(name)))throw Error("Reopen this contact.");const prior=doc.contactInfo?.[normalize(name)]??doc.state.contacts.find(c=>normalize(c.name)===normalize(name))?.info??emptyContactInfo(name);const fakeFields=(prior.fakeFields??[]).filter(f=>input[f]===undefined||input[f]===prior[f as "phone"|"email"]);const info=readContactInfo({...prior,...input,fakeFields,locked:input.kind!==undefined?true:prior.locked,confirmed:[...new Set([...(prior.confirmed??[]),...["phone","email","relationship","details"].filter(k=>input[k]!==undefined)])]},name);(doc.contactInfo??={})[normalize(name)]=info;if(contactDuplicates(doc.contactInfo))this.io.warn?.("Lumi Phone Tracker: duplicate contact number or address; ambiguous matching disabled.");}
      if(update.portrait!==undefined){
        const p=update.portrait;if(!isRecord(p)||typeof p.name!=="string"||!doc.state.contacts.some(c=>portraitKey(c.name)===portraitKey(p.name as string)))throw Error("Reopen the contact before changing its portrait.");
        const data=Object.assign(Object.create(null),doc.portraits) as Record<string,string>;if(p.data===null)delete data[portraitKey(p.name)];else {portraitBytes(p.data);data[portraitKey(p.name)]=p.data as string;}
        if(Object.values(data).reduce((n,v)=>n+v.length,0)>PORTRAIT_CHAT_LIMIT)throw Error("Portrait storage is full. Remove a portrait first.");doc.portraits=data;
      }
      if(isRecord(update.edit)&&update.edit.target==="contact"&&typeof update.edit.name==="string"&&doc.portraits){const key=portraitKey(update.edit.name);if(update.edit.remove)delete doc.portraits[key];else if(typeof update.edit.rename==="string"&&portraitKey(update.edit.rename)!==key&&doc.portraits[key]){doc.portraits[portraitKey(update.edit.rename)]=doc.portraits[key];delete doc.portraits[key];}}
      doc = replay(doc, rows, doc.playerNames);
      doc.revision = saved.revision + 1;
      await this.io.write(chatId, JSON.stringify(doc)); return doc;
    });
  }
  setupApply(userId:string,chatId:string,revision:number,input:SetupData,names:string[],decisions?:unknown):Promise<Document>{
    return this.serial(chatId,async()=>{
      if(!userId||!await this.io.authorize(chatId,userId))throw Error("Chat unavailable");const raw=await this.io.read(chatId),saved=readDocument(raw,chatId);if(saved.revision!==revision)throw Error("The tracker changed. Nothing was saved.");let {doc,rows}=await this.build(chatId,userId);if(doc.trackingEnabled===false)throw Error("Turn on the tracker for this chat first.");if(JSON.stringify(doc.accepted,canonicalKeys)!==JSON.stringify(saved.accepted,canonicalKeys))throw Error("The story changed. Nothing was saved.");const data=setupCandidates(doc,resolveSetup(doc,input,decisions)),last=[...rows].sort((a,b)=>a.index_in_chat-b.index_in_chat).at(-1);
      const add=(target:ManualEdit["target"],name:string,value:unknown,section?:Section)=>doc.edits.push(validateEdit({id:crypto.randomUUID(),target,name,value,source:"setup",...(target==="contact"?{playerAtEdit:doc.playerNames.some(n=>normalize(n)===normalize(name))}:{}),...(section?{section}:{}),after:last?.id??null,index:last?.index_in_chat??-1}));
      for(const c of data.contacts){const old=doc.state.contacts.find(x=>normalize(x.name)===normalize(c.name));const values=Object.fromEntries(CONTACT_KEYS.filter(k=>c[k]!==undefined).map(k=>[k,c[k]]));if(!old||Object.keys(values).length)add("contact",c.name,values);const prior=doc.contactInfo?.[normalize(c.name)]??old?.info??emptyContactInfo(c.name);const fields=Object.keys(c).filter(k=>["phone","email","relationship","details"].includes(k));const info=readContactInfo({...prior,...c,fakeFields:[...new Set([...(prior.fakeFields??[]),...(c.fakeFields??[])])],kind:prior.locked?prior.kind:names.some(n=>normalize(n)===normalize(c.name))?"Main":prior.kind,confirmed:[...new Set([...(prior.confirmed??[]),...fields])]},c.name);(doc.contactInfo??=Object.create(null))[normalize(c.name)]=info;}
      for(const n of data.notes)add("note",n.name,{detail:n.detail,context:n.context,...(n.section==="misc"?{sendToAI:false}:{})},n.section);
      for(const p of data.locations)add("location",p.name,{description:p.description,relation:p.relation});
      doc=replay(doc,rows,doc.playerNames);projectContacts(doc,names);doc.revision=saved.revision+1;await this.io.write(chatId,JSON.stringify(doc));return doc;
    });
  }
  helperPreview(userId:string,chatId:string):Promise<HelperTicket> {
    return this.serial(chatId,async()=>{if(!userId||!await this.io.authorize(chatId,userId))throw Error("Chat unavailable");const {doc,rows}=await this.build(chatId,userId);return {doc,recent:[...rows].sort((a,b)=>a.index_in_chat-b.index_in_chat).filter(r=>r.role!=="system").slice(-doc.settings.helperMessages),history:""};});
  }
  helperStart(userId: string, chatId: string, attempt: string, expected?: { id: string; content: string }): Promise<HelperTicket | null> {
    return this.serial(chatId, async () => {
      if (!userId || !(await this.io.authorize(chatId,userId))) throw new Error("Chat unavailable");
      const { doc, rows } = await this.build(chatId,userId);
      if (doc.trackingEnabled===false || doc.settings.source !== "helper" || doc.helperOwner !== userId || doc.helperAttempts.includes(attempt)) return null;
      if(!Object.entries(effectiveDocument(doc).settings.enabled).some(([key,on])=>on&&key!=="messages"&&key!=="email"&&key!=="notes.misc"))return null;
      if (expected && !rows.some(r => r.id === expected.id && r.role === "assistant" && r.content === expected.content)) return null;
      const recent = [...rows].sort((a,b)=>a.index_in_chat-b.index_in_chat).filter(r=>r.role !== "system").slice(-doc.settings.helperMessages);
      if (!recent.length) return null;
      const raw = await this.io.read(chatId); const revision = raw ? readDocument(raw,chatId).revision : 0;
      doc.revision = revision;
      if (expected) {
        if (JSON.stringify(doc) !== raw) doc.revision++;
        doc.helperAttempts.push(attempt); // Automatic events stay deduplicated across restarts.
        await this.io.write(chatId,JSON.stringify(doc));
      }
      return { doc, recent, history: JSON.stringify(rows.map(rowSignature)) };
    });
  }
  helperFinish(userId: string, ticket: HelperTicket, values: Record<string,unknown>, prose: string): Promise<Document | null> {
    const chatId = ticket.doc.chatId;
    return this.serial(chatId,async()=>{
      if (!(await this.io.authorize(chatId,userId))) throw new Error("Chat unavailable");
      const raw = await this.io.read(chatId); const saved = readDocument(raw,chatId);
      const { doc, rows } = await this.build(chatId,userId);
      if (doc.trackingEnabled===false || saved.revision !== ticket.doc.revision || doc.settings.source !== "helper" || doc.helperOwner !== userId ||
        doc.settings.connection_id !== ticket.doc.settings.connection_id || JSON.stringify(rows.map(rowSignature)) !== ticket.history) return null;
      validateExpanded(values);
      const last = ticket.recent.at(-1)!;
      doc.helperEntries.push({ id: crypto.randomUUID(), at: {id:last.id,index:last.index_in_chat,variant:JSON.stringify([last.swipe_id,last.swipe_dates?.[last.swipe_id]??null])},
        sources:ticket.recent.map(r=>({id:r.id,signature:helperSourceSignature(r)})),values,prose });
      const next = replay(doc,rows,doc.playerNames); next.currentPlayer = doc.currentPlayer; next.revision = saved.revision+1;
      await this.io.write(chatId,JSON.stringify(next)); return next;
    });
  }
  helperNotice(userId: string, chatId: string, text: string | null, fallback = false): Promise<void> {
    return this.serial(chatId,async()=>{
      if (!(await this.io.authorize(chatId,userId))) return;
      const raw=await this.io.read(chatId);if(!raw)return;
      const value:unknown=JSON.parse(raw);if(!isRecord(value)||value.schema!==2||value.chatId!==chatId||!Number.isSafeInteger(value.revision)||!Array.isArray(value.notices)||value.notices.some(n=>typeof n!=="string"))throw Error("Invalid saved data");
      const doc=value as unknown as Document;readSettings(doc.settings);if(doc.trackingEnabled===false)return;
      const old=JSON.stringify(doc.notices);
      doc.notices=doc.notices.filter(n=>!isHelperNotice(n));
      if(text)doc.notices.push(text);
      if(JSON.stringify(doc.notices)===old&&!fallback)return;
      if (fallback && doc.settings.source === "helper" && doc.helperOwner === userId) doc.settings.source = "main";
      doc.revision++; await this.io.write(chatId,JSON.stringify(doc));
    });
  }
}
export interface HelperTicket { doc: Document; recent: StoryRow[]; history: string }

function canonicalKeys(_key:string,value:unknown):unknown{return isRecord(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value;}

async function sourceHash(row:StoryRow):Promise<string>{const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(rowSignature(row)));return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,"0")).join("");}
/** Saved derived state is used only after this version has made an authoritative checkpoint. */
function materialized(raw:string,chatId:string):Document|null {
 if(!raw)return null;const value:unknown=JSON.parse(raw);if(!isRecord(value))throw Error("Invalid saved data");
 const doc=readDocument(raw,chatId);if(doc.trackingEnabled===false)return doc;
 if(!doc.checkpoint)return null;
 const s=value.state;if(!isRecord(s)||!isRecord(s.scene)||!isRecord(s.notes)||!["contacts","locations","messages","calls","emails","bank","transactions","notices"].every(k=>Array.isArray(s[k]))||!SECTIONS.every(k=>Array.isArray((s.notes as Record<string,unknown>)[k])))throw Error("Invalid saved state");
 const origin=(v:unknown)=>isRecord(v)&&typeof v.id==="string"&&Number.isInteger(v.index)&&typeof v.variant==="string";
 const cell=(v:unknown)=>isRecord(v)&&origin(v.at)&&["ai","user"].includes(String(v.by))&&typeof v.inferred==="boolean";
 if(Object.values(s.scene).some(v=>!cell(v))||s.weather!==undefined&&!cell(s.weather)||(s.contacts as unknown[]).some((c:unknown)=>!isRecord(c)||typeof c.name!=="string"||typeof c.player!=="boolean"||!isRecord(c.fields)||Object.values(c.fields).some(v=>!cell(v)))||(s.messages as unknown[]).some((m:unknown)=>!isRecord(m)||typeof m.id!=="string"||typeof m.from!=="string"||typeof m.text!=="string"||!["incoming","outgoing"].includes(String(m.direction))||!origin(m.at)))throw Error("Invalid saved state");
 if(!Array.isArray(value.playerNames)||value.playerNames.some(v=>typeof v!=="string")||value.currentPlayer!==undefined&&typeof value.currentPlayer!=="string")throw Error("Invalid player identity");
 doc.playerNames=value.playerNames as string[];doc.currentPlayer=value.currentPlayer as string|undefined;
 doc.state=s as unknown as Document["state"];return doc;
}

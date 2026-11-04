import { isRecord } from "./shared";
import { chatPath } from "./store";
import { emptyDocument, emptyState, readSettings, SECTIONS, normalize, type Document, type ManualEdit, type HelperEntry } from "./model";
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
  warn?(text: string): void;
}
export function readDocument(raw: string, chatId: string): Document {
  if (!raw) return emptyDocument(chatId);
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value) || value.schema !== 2 || value.chatId !== chatId || !Number.isSafeInteger(value.revision) ||
    !Array.isArray(value.accepted) || !Array.isArray(value.edits)) throw new Error("Invalid saved data");
  const doc = emptyDocument(chatId); doc.revision = value.revision as number;
  if (value.rejected !== undefined && (!Array.isArray(value.rejected) || value.rejected.some(x => typeof x !== "string"))) throw new Error("Invalid rejection data");
  doc.rejected = value.rejected as string[] ?? [];
  for (const key of ["notices", "inferences"] as const) {
    if (value[key] !== undefined && (!Array.isArray(value[key]) || (value[key] as unknown[]).some(x => typeof x !== "string"))) throw new Error("Invalid saved metadata");
    doc[key] = value[key] as string[] ?? [];
  }
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
    const rawPatch = { ...entry.patch.scene, ...(entry.patch.weather ? { weather: entry.patch.weather } : {}),
      contacts: entry.patch.contacts.map(c => {
        if (!isRecord(c) || !isRecord(c.fields)) throw new Error("Invalid saved contact");
        return { name: c.name, ...c.fields };
      }), locations: entry.patch.locations, ...entry.patch.notes };
    const patch = validateExpanded(rawPatch);
    for (const text of entry.texts) if (!isRecord(text) || !short(text.from, 100) || typeof text.text !== "string" || text.text.length > 3000 ||
      (text.to !== undefined && !short(text.to, 100)) || (text.time !== undefined && !short(text.time, 100))) throw new Error("Invalid saved text");
    doc.accepted.push({ at: entry.at as unknown as Document["accepted"][number]["at"], patch,
      texts: entry.texts as Document["accepted"][number]["texts"], role: entry.role as "assistant" | "user",
      ...(typeof entry.name === "string" ? { name: entry.name } : {}), prose: entry.prose });
  }
  // Only validated admission names are read from the cached state. All values are replayed.
  if (isRecord(value.state) && isRecord(value.state.notes)) for (const section of SECTIONS) {
    const notes = value.state.notes[section]; if (!Array.isArray(notes)) continue;
    for (const n of notes) if (isRecord(n) && short(n.name, 100)) doc.state.notes[section].push({
      name: n.name, detail: "", context: "", resolved: false, sendToAI: false,
      by: "ai", addedByUser: false, updated: false, at: { id: "admission", index: -1, variant: "" },
    });
  }
  return doc;
}
export function validateEdit(value: unknown): ManualEdit {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id ||
    !(value.after === null || typeof value.after === "string") || !Number.isInteger(value.index) || (value.index as number) < -1 ||
    !["scene", "weather", "contact", "location", "note"].includes(String(value.target)) ||
    (value.remove !== undefined && typeof value.remove !== "boolean")) throw new Error("Invalid edit");
  const edit = value as unknown as ManualEdit;
  applyManual(emptyState(), edit, new Set(), new Set());
  return structuredClone(edit);
}
export class PhoneStore {
  private queues = new Map<string, Promise<unknown>>();
  private skips: SkipLogger;
  constructor(private io: PhoneIO) { this.skips = new SkipLogger(text => this.io.warn?.(text)); }
  private serial<T>(chatId: string, action: () => Promise<T>): Promise<T> {
    const task = (this.queues.get(chatId) ?? Promise.resolve()).catch(() => {}).then(action);
    this.queues.set(chatId, task);
    const cleanup = () => { if (this.queues.get(chatId) === task) this.queues.delete(chatId); };
    void task.then(cleanup, cleanup); return task;
  }
  private async build(chatId: string, userId: string): Promise<{ doc: Document; rows: StoryRow[] }> {
    if (!chatId || chatId.length > 256) throw new Error("Missing chat");
    const raw = await this.io.read(chatId); let doc = readDocument(raw, chatId);
    // Keep the exact old payload. Migration never deletes or rewrites the old file.
    if (!raw && userId && this.io.legacy) {
      const legacy = await this.io.legacy(userId, chatPath(chatId));
      if (legacy !== null) {
        const old = readSnapshot(legacy, chatId); doc.legacy = legacy;
        doc.accepted = old.entries.map(e => {
          const p = e.patch;
          const patch = validateExpanded({ location: p.location, time: p.time, present: p.present, weather: p.weather });
          return { at: { id: e.source.messageId, index: e.source.index, variant: e.source.variant },
            patch, texts: e.texts, role: "assistant", prose: "" };
        });
      }
    }
    const rows = await this.io.history(chatId);
    const player = await this.io.player(chatId, userId);
    doc = replay(doc, rows, player ? [player] : [], (row, issues) => this.skips.record(chatId, row, issues));
    doc.currentPlayer = player ?? undefined;
    return { doc, rows };
  }
  /** Read-only preview with a trusted user and an authorized chat. Never writes. */
  preview(chatId: string, userId: string): Promise<Document> {
    return this.serial(chatId, async () => {
      if (!userId || !(await this.io.authorize(chatId, userId))) throw new Error("Chat unavailable");
      return (await this.build(chatId, userId)).doc;
    });
  }
  sync(userId: string, chatId: string): Promise<Document> {
    return this.serial(chatId, async () => {
      if (!userId || !(await this.io.authorize(chatId, userId))) throw new Error("Chat unavailable");
      const { doc } = await this.build(chatId, userId);
      const raw = await this.io.read(chatId);
      const comparable = { ...doc, revision: raw ? (JSON.parse(raw) as Document).revision : 0 };
      if (JSON.stringify(comparable) !== raw) {
        doc.revision = comparable.revision + 1; await this.io.write(chatId, JSON.stringify(doc));
      }
      return doc;
    });
  }
  /** Step 4's controls will use this same validated, chat-authorized operation. */
  update(userId: string, chatId: string, expectedRevision: number, update: { settings?: unknown; edit?: unknown; dismissNotice?: unknown }): Promise<Document> {
    return this.serial(chatId, async () => {
      if (!userId || !(await this.io.authorize(chatId, userId))) throw new Error("Chat unavailable");
      const raw = await this.io.read(chatId); const saved = readDocument(raw, chatId);
      if (saved.revision !== expectedRevision) throw new Error("The tracker changed. Reopen it and try again.");
      let { doc, rows } = await this.build(chatId, userId);
      if (JSON.stringify(doc.accepted) !== JSON.stringify(saved.accepted) && raw) throw new Error("The story changed. Reopen the tracker and try again.");
      if (update.settings !== undefined) {
        if (!isRecord(update.settings)) throw new Error("Invalid settings");
        const enabled = update.settings.enabled;
        if (enabled !== undefined && !isRecord(enabled)) throw new Error("Invalid switches");
        doc.settings = readSettings({ ...doc.settings, ...update.settings,
          enabled: { ...doc.settings.enabled, ...(isRecord(enabled) ? enabled : {}) } });
        if (update.settings.source === "helper") doc.helperOwner = userId;
      }
      if (update.dismissNotice !== undefined) {
        if (typeof update.dismissNotice !== "string") throw new Error("Invalid notice");
        doc.notices = doc.notices.filter(n => n !== update.dismissNotice);
      }
      if (update.edit !== undefined) {
        const input = isRecord(update.edit) ? update.edit : {};
        // Anchor/revision/identity come from the saved history, never from UI claims.
        const last = [...rows].sort((a, b) => a.index_in_chat - b.index_in_chat).at(-1);
        const edit = validateEdit({ ...input, id: crypto.randomUUID(), after: last?.id ?? null, index: last?.index_in_chat ?? -1 });
        if (edit.target === "note" && edit.section && !edit.remove) {
          const notes = doc.state.notes[edit.section];
          const existing = notes.some(n => normalize(n.name) === normalize(edit.name ?? ""));
          const resolved = edit.section === "plots" && isRecord(edit.value) && edit.value.resolved === true;
          if (!existing && !resolved && notes.filter(n => !n.resolved).length >= doc.settings.notesPerSection) throw new Error("This section is full. Delete a note to make room.");
        }
        doc.edits.push(edit);
      }
      doc = replay(doc, rows, doc.playerNames);
      doc.revision = saved.revision + 1;
      await this.io.write(chatId, JSON.stringify(doc)); return doc;
    });
  }
  helperStart(userId: string, chatId: string, attempt: string, expected?: { id: string; content: string }): Promise<HelperTicket | null> {
    return this.serial(chatId, async () => {
      if (!userId || !(await this.io.authorize(chatId,userId))) throw new Error("Chat unavailable");
      const { doc, rows } = await this.build(chatId,userId);
      if (doc.settings.source !== "helper" || doc.helperOwner !== userId || doc.helperAttempts.includes(attempt)) return null;
      if(!Object.entries(doc.settings.enabled).some(([key,on])=>on&&key!=="messages"&&key!=="notes.misc"))return null;
      if (expected && !rows.some(r => r.id === expected.id && r.role === "assistant" && r.content === expected.content)) return null;
      const recent = [...rows].sort((a,b)=>a.index_in_chat-b.index_in_chat).filter(r=>r.role !== "system").slice(-doc.settings.helperMessages);
      if (!recent.length) return null;
      const raw = await this.io.read(chatId); const revision = raw ? readDocument(raw,chatId).revision : 0;
      doc.revision = revision;
      if (JSON.stringify(doc) !== raw) doc.revision++;
      doc.helperAttempts.push(attempt); // Durable before dispatch; failures do not retry on a repeated event.
      await this.io.write(chatId,JSON.stringify(doc));
      return { doc, recent, history: JSON.stringify(rows.map(rowSignature)) };
    });
  }
  helperFinish(userId: string, ticket: HelperTicket, values: Record<string,unknown>, prose: string): Promise<Document | null> {
    const chatId = ticket.doc.chatId;
    return this.serial(chatId,async()=>{
      if (!(await this.io.authorize(chatId,userId))) throw new Error("Chat unavailable");
      const raw = await this.io.read(chatId); const saved = readDocument(raw,chatId);
      const { doc, rows } = await this.build(chatId,userId);
      if (saved.revision !== ticket.doc.revision || doc.settings.source !== "helper" || doc.helperOwner !== userId ||
        doc.settings.connection_id !== ticket.doc.settings.connection_id || JSON.stringify(rows.map(rowSignature)) !== ticket.history) return null;
      validateExpanded(values);
      const last = ticket.recent.at(-1)!;
      doc.helperEntries.push({ id: crypto.randomUUID(), at: {id:last.id,index:last.index_in_chat,variant:JSON.stringify([last.swipe_id,last.swipe_dates?.[last.swipe_id]??null])},
        sources:ticket.recent.map(r=>({id:r.id,signature:helperSourceSignature(r)})),values,prose });
      const next = replay(doc,rows,doc.playerNames); next.currentPlayer = doc.currentPlayer; next.revision = saved.revision+1;
      await this.io.write(chatId,JSON.stringify(next)); return next;
    });
  }
  helperNotice(userId: string, chatId: string, text: "Tracker update failed" | "Connection not found", fallback = false): Promise<void> {
    return this.serial(chatId,async()=>{
      if (!(await this.io.authorize(chatId,userId))) return;
      const raw = await this.io.read(chatId); const { doc } = await this.build(chatId,userId);
      if (!doc.notices.includes(text)) doc.notices.push(text);
      if (fallback && doc.settings.source === "helper" && doc.helperOwner === userId) doc.settings.source = "main";
      doc.revision++; await this.io.write(chatId,JSON.stringify(doc));
    });
  }
}
export interface HelperTicket { doc: Document; recent: StoryRow[]; history: string }

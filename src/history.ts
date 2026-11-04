import { parseReply, validatePatch, type PhoneText } from "./parser";
import { isRecord, type TrackerPatch } from "./shared";

export interface HistoryMessage {
  id: string; chat_id: string; index_in_chat: number;
  role: "assistant" | "user" | "system";
  content: string; swipe_id: number; swipe_dates?: number[];
}
export interface Source { messageId: string; index: number; variant: string }
export interface SavedText extends PhoneText { id: string; source: Source }
export interface Entry { source: Source; patch: TrackerPatch; texts: PhoneText[] }
export interface ChatSnapshot {
  schema: 1; chatId: string; entries: Entry[]; tracker: TrackerPatch; texts: SavedText[];
}
export function emptySnapshot(chatId: string): ChatSnapshot {
  return { schema: 1, chatId, entries: [], tracker: {}, texts: [] };
}

function variantOf(message: HistoryMessage): string {
  return JSON.stringify([message.swipe_id, message.swipe_dates?.[message.swipe_id] ?? null]);
}

/** Replay selected saved content in story order, never render order. */
export function rebuild(chatId: string, messages: HistoryMessage[], previous = emptySnapshot(chatId)): ChatSnapshot {
  if (previous.chatId !== chatId) throw new Error("Chat mismatch");
  const snapshot = emptySnapshot(chatId);
  const old = new Map(previous.entries.map(e => [JSON.stringify([e.source.messageId, e.source.variant]), e]));
  const ids = new Set<string>();
  const indexes = new Set<number>();
  for (const message of [...messages].sort((a, b) => a.index_in_chat - b.index_in_chat)) {
    if (message.chat_id !== chatId || !message.id || ids.has(message.id) ||
      !Number.isInteger(message.index_in_chat) || indexes.has(message.index_in_chat)) throw new Error("Invalid history");
    ids.add(message.id); indexes.add(message.index_in_chat);
    if (message.role !== "assistant") continue;
    const source = { messageId: message.id, index: message.index_in_chat, variant: variantOf(message) };
    const prior = old.get(JSON.stringify([source.messageId, source.variant]));
    const parsed = parseReply(message.content);
    // A malformed edit in the SAME variant preserves its last valid data.
    // An absent tag is removal; a different swipe is a different source.
    const patch = parsed.invalidTracker ? prior?.patch ?? {} : parsed.patch;
    const texts = parsed.invalidTexts ? prior?.texts ?? parsed.texts : parsed.texts;
    if (Object.keys(patch).length || texts.length) snapshot.entries.push({ source, patch, texts });
    Object.assign(snapshot.tracker, patch);
    texts.forEach((text, ordinal) => snapshot.texts.push({
      ...text, source, id: JSON.stringify([source.messageId, source.variant, ordinal]),
    }));
  }
  return snapshot;
}

/** Persisted input is untrusted too; reconstruct derived fields from validated entries. */
export function readSnapshot(value: unknown, chatId: string): ChatSnapshot {
  if (value === null) return emptySnapshot(chatId);
  if (!isRecord(value) || value.schema !== 1 || value.chatId !== chatId || !Array.isArray(value.entries)) throw new Error("Invalid saved tracker");
  const result = emptySnapshot(chatId);
  for (const item of value.entries) {
    if (!isRecord(item) || !isRecord(item.source) || typeof item.source.messageId !== "string" ||
      typeof item.source.variant !== "string" || !Number.isInteger(item.source.index) || !Array.isArray(item.texts)) throw new Error("Invalid saved entry");
    const patch = validatePatch(item.patch);
    if (!patch) throw new Error("Invalid saved patch");
    const texts: PhoneText[] = [];
    for (const text of item.texts) {
      if (!isRecord(text) || typeof text.from !== "string" || !text.from.trim() || text.from.length > 100 ||
        typeof text.text !== "string" || !text.text.trim() || text.text.length > 3000 ||
        (text.time !== undefined && (typeof text.time !== "string" || text.time.length > 100))) throw new Error("Invalid saved text");
      texts.push({ from: text.from, text: text.text, ...(typeof text.time === "string" ? { time: text.time } : {}) });
    }
    const source = { messageId: item.source.messageId, variant: item.source.variant, index: item.source.index as number };
    result.entries.push({ source, patch, texts });
  }
  result.entries.sort((a, b) => a.source.index - b.source.index);
  for (const entry of result.entries) {
    Object.assign(result.tracker, entry.patch);
    entry.texts.forEach((text, ordinal) => result.texts.push({ ...text, source: entry.source,
      id: JSON.stringify([entry.source.messageId, entry.source.variant, ordinal]) }));
  }
  return result;
}

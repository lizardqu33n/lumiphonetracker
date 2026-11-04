import type { SpindleFrontendContext } from "lumiverse-spindle-types";
import { normalize, type SavedMessage } from "./model";
import { short } from "./schema";

export interface ReadState { revision: number; seen: Record<string, string> }
export const emptyReads = (): ReadState => ({ revision: 0, seen: {} });
export const receipt = (m: SavedMessage): string => JSON.stringify([m.from, m.to ?? null, m.time ?? null, m.text]);
export const isUnread = (m: SavedMessage, reads: ReadState): boolean => m.direction === "incoming" && reads.seen[m.id] !== receipt(m);
export const threadKey = (m: SavedMessage): string => m.direction === "incoming" ? normalize(m.from) : m.to ? normalize(m.to) : "";
export interface Conversation { key: string; name: string; messages: SavedMessage[]; unread: number }
export function conversations(messages: SavedMessage[], reads: ReadState): Conversation[] {
  const groups = new Map<string, Conversation>();
  for (const m of messages) {
    const key = threadKey(m);
    const group = groups.get(key) ?? { key, name: m.direction === "incoming" ? m.from : m.to ?? "Your texts", messages: [], unread: 0 };
    group.messages.push(m); if (isUnread(m, reads)) group.unread++;
    groups.set(key, group);
  }
  return [...groups.values()];
}
const escape = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
export function replyTag(from: string, to: string, text: string): string {
  if (!short(from, 100) || !from.trim() || !short(to, 100) || !to.trim()) throw new Error("Your character's name or the recipient is unavailable. Reopen this chat.");
  if (!text.trim() || text.trim().length > 3000 || text.includes("\u0000")) throw new Error("Write a reply of up to 3,000 characters.");
  return `<phone-text from="${escape(from.trim())}" to="${escape(to.trim())}">${escape(text.trim())}</phone-text>`;
}
/** Synchronous documented composer writes: never sends or changes saved history. */
export function addReplyDraft(ctx: Pick<SpindleFrontendContext, "composer" | "host">, chatId: string, from: string, to: string, text: string): { manual: boolean; tag: string } {
  const tag = replyTag(from, to, text);
  if (!ctx.composer || !((ctx.host?.capabilities?.["composer-v1"] ?? 0) >= 1)) return { manual: true, tag };
  const state = ctx.composer.getState();
  if (!state.mounted || state.chatId !== chatId) throw new Error("The chat input changed. Open the original chat before adding this reply.");
  ctx.composer.insertText(`${state.text && !state.text.endsWith("\n") ? "\n" : ""}${tag}`, { at: "end" });
  // A host callback may change chats during insertion; never focus a different chat.
  try { const after = ctx.composer.getState(); if (after.mounted && after.chatId === chatId) ctx.composer.focus(); }
  catch { /* The draft was already inserted; a focus failure must not encourage duplicate insertion. */ }
  return { manual: false, tag };
}

import { isRecord } from "./shared";
import { emptyReads, receipt, threadKey, type ReadState } from "./messages";
import type { SavedMessage } from "./model";

export function readState(value: unknown): ReadState {
  if (!isRecord(value) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 || !isRecord(value.seen) ||
    Object.entries(value.seen).some(([k,v]) => k.length > 2000 || typeof v !== "string" || v.length > 20000)) throw new Error("Invalid read history");
  return { revision: Number(value.revision), seen: { ...value.seen } as Record<string,string> };
}
/** Per-user/per-chat receipts; never part of model continuity or story state. */
export class MessageReads {
  private queues = new Map<string, Promise<unknown>>();
  constructor(private io: { read(user: string, chat: string): Promise<unknown>; write(user: string, chat: string, value: ReadState): Promise<void> }) {}
  private serial<T>(user: string, chat: string, fn: () => Promise<T>): Promise<T> {
    if (!user || !chat) return Promise.reject(new Error("Missing chat or user"));
    const key = JSON.stringify([user,chat]); const task = (this.queues.get(key) ?? Promise.resolve()).catch(() => {}).then(fn);
    this.queues.set(key, task); const done = () => { if (this.queues.get(key) === task) this.queues.delete(key); }; void task.then(done,done); return task;
  }
  read(user: string, chat: string): Promise<ReadState> { return this.serial(user, chat, async () => readState(await this.io.read(user,chat))); }
  mark(user: string, chat: string, key: string, observed: { id: string; receipt: string }[], messages: SavedMessage[]): Promise<ReadState> {
    return this.serial(user,chat, async () => {
      const state = readState(await this.io.read(user,chat));
      const wanted = new Map(observed.map(m => [m.id,m.receipt]));
      for (const m of messages) if (m.direction === "incoming" && threadKey(m) === key && wanted.get(m.id) === receipt(m)) state.seen[m.id] = receipt(m);
      state.revision++; await this.io.write(user,chat,state); return state;
    });
  }
}
export { emptyReads };

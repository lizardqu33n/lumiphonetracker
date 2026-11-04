import { readSnapshot, rebuild, type ChatSnapshot, type HistoryMessage } from "./history";

export interface TrackerIO {
  authorize(userId: string, chatId: string): Promise<boolean>;
  history(userId: string, chatId: string): Promise<HistoryMessage[]>;
  read(userId: string, path: string): Promise<unknown>;
  write(userId: string, path: string, snapshot: ChatSnapshot): Promise<void>;
}
// Hex encoding makes dots, slashes, and '%' harmless in a path segment.
export function chatPath(chatId: string): string {
  return `chats/c-${Array.from(new TextEncoder().encode(chatId), b => b.toString(16).padStart(2, "0")).join("")}.json`;
}
export class TrackerStore {
  private readonly queues = new Map<string, Promise<unknown>>();
  constructor(private readonly io: TrackerIO) {}
  sync(userId: string, chatId: string): Promise<ChatSnapshot> {
    if (!userId || !chatId || chatId.length > 256) return Promise.reject(new Error("Missing chat context"));
    const key = JSON.stringify([userId, chatId]);
    const task = (this.queues.get(key) ?? Promise.resolve()).catch(() => {}).then(async () => {
      if (!(await this.io.authorize(userId, chatId))) throw new Error("Chat not available");
      const path = chatPath(chatId);
      const previous = readSnapshot(await this.io.read(userId, path), chatId);
      const messages = await this.io.history(userId, chatId);
      const snapshot = rebuild(chatId, messages, previous);
      // Serialize through persistence so a slower earlier request cannot win later.
      if (JSON.stringify(snapshot) !== JSON.stringify(previous)) await this.io.write(userId, path, snapshot);
      return snapshot;
    });
    this.queues.set(key, task);
    const cleanup = () => { if (this.queues.get(key) === task) this.queues.delete(key); };
    void task.then(cleanup, cleanup);
    return task;
  }
}

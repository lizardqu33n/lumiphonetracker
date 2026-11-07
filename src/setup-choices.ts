import { SETUP_FIELD_IDS, type SetupField } from "./setup-fields";

export class SetupChoiceStore {
  private pending = new Map<string, Promise<SetupField[]>>();
  constructor(private io: {
    authorize(user: string, chat: string): Promise<boolean>;
    read(user: string, chat: string): Promise<unknown>;
    write(user: string, chat: string, choices: SetupField[]): Promise<void>;
  }) {}

  access(user: string, chat: string, save: boolean, value?: unknown): Promise<SetupField[]> {
    const key = JSON.stringify([user, chat]);
    const task = (this.pending.get(key) ?? Promise.resolve()).catch(() => {}).then(async () => {
      if (!user || !chat || !await this.io.authorize(user, chat)) throw Error("Chat unavailable.");
      const raw = save ? value : await this.io.read(user, chat);
      if (!Array.isArray(raw) || raw.length > SETUP_FIELD_IDS.length || raw.some(field => !SETUP_FIELD_IDS.includes(field))) {
        if (save) throw Error("Invalid setup choices.");
        return [];
      }
      const choices = [...new Set(raw as SetupField[])];
      if (save) await this.io.write(user, chat, choices);
      return choices;
    });
    this.pending.set(key, task);
    const clear = () => { if (this.pending.get(key) === task) this.pending.delete(key); };
    void task.then(clear, clear);
    return task;
  }
}

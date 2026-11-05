import { isRecord } from "./shared";

import { ALL_APPS } from "./model";
export const APPS = ALL_APPS;
export type App = typeof APPS[number];
export interface Preferences { revision: number; css: string; dismissed: (App|"Home")[] }
export const defaultPreferences = (): Preferences => ({ revision: 0, css: "", dismissed: [] });
export function readPreferences(value: unknown): Preferences {
  if (!isRecord(value) || typeof value.css !== "string" || value.css.length > 32000 ||
    !Number.isSafeInteger(value.revision) || !Array.isArray(value.dismissed) ||
    value.dismissed.some(a => ![...APPS,"Home","Settings"].includes(a as App))) throw new Error("Invalid appearance preferences");
  return { revision: value.revision as number, css: value.css, dismissed: [...new Set(value.dismissed)].filter(a=>a!=="Settings") as (App|"Home")[] };
}
export class PreferenceStore {
  private queues = new Map<string, Promise<unknown>>();
  constructor(private io: { read(user: string): Promise<unknown>; write(user: string, prefs: Preferences): Promise<void> }) {}
  read(user: string): Promise<Preferences> { return this.serial(user, async () => readPreferences(await this.io.read(user))); }
  update(user: string, change: unknown): Promise<Preferences> {
    return this.serial(user, async () => {
      if (!isRecord(change) || Object.keys(change).some(k => !["css", "dismiss"].includes(k))) throw new Error("Invalid appearance change");
      const prefs = readPreferences(await this.io.read(user));
      if (change.css !== undefined) {
        if (typeof change.css !== "string" || change.css.length > 32000) throw new Error("Custom CSS is too long");
        prefs.css = change.css;
      }
      if (change.dismiss !== undefined) {
        if (![...APPS,"Home"].includes(change.dismiss as App|"Home")) throw new Error("Invalid app");
        if (!prefs.dismissed.includes(change.dismiss as App|"Home")) prefs.dismissed.push(change.dismiss as App|"Home");
      }
      prefs.revision++; await this.io.write(user, prefs); return prefs;
    });
  }
  private serial<T>(user: string, action: () => Promise<T>): Promise<T> {
    if (!user) return Promise.reject(new Error("Missing user"));
    const task = (this.queues.get(user) ?? Promise.resolve()).catch(() => {}).then(action);
    this.queues.set(user, task);
    const done = () => { if (this.queues.get(user) === task) this.queues.delete(user); };
    void task.then(done, done); return task;
  }
}

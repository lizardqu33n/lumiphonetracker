import { describe, expect, test } from "bun:test";
import { PreferenceStore, defaultPreferences, readPreferences } from "../src/preferences";
import { applyManual, replay, type StoryRow } from "../src/engine";
import { emptyDocument, emptyState, type ManualEdit } from "../src/model";
import { readDocument } from "../src/phone-store";

const edit = (more: Partial<ManualEdit>): ManualEdit => ({ id: crypto.randomUUID(), target: "contact", after: "m0", index: 0, ...more });
const row = (index: number, data: Record<string, unknown>): StoryRow => ({ id: `m${index}`, chat_id: "a", role: "assistant", swipe_id: 0,
  index_in_chat: index, content: `Ada and Player are at Cafe.\n<phone-state>\n${Object.entries(data).map(([k,v]) => `${k}=${JSON.stringify(v)}`).join("\n")}\n</phone-state>` });
describe("Step 4 appearance and editable cards", () => {
  test("appearance is user-specific, persistent, and serialized without losing dismissal or CSS", async () => {
    const disk = new Map<string, unknown>();
    const io = { read: async (user: string) => structuredClone(disk.get(user) ?? defaultPreferences()), write: async (user: string, data: unknown) => { disk.set(user, structuredClone(data)); } };
    const store = new PreferenceStore(io);
    await Promise.all([store.update("alice", { css: ".lpt-root { --lpt-width: 400px; }" }), store.update("alice", { dismiss: "Scene" })]);
    await store.update("alice", { dismiss: "Scene" });
    const saved = await new PreferenceStore(io).read("alice");
    expect(saved.css).toContain("400px"); expect(saved.dismissed).toEqual(["Scene"]); expect(saved.revision).toBe(3);
    expect(await store.read("bob")).toEqual(defaultPreferences());
    await store.update("alice", { css: "" });
    expect((await store.read("alice")).dismissed).toEqual(["Scene"]);
    expect((await store.read("alice")).css).toBe("");
  });
  test("invalid appearance changes never replace saved preferences", async () => {
    let disk = defaultPreferences(); const store = new PreferenceStore({ read: async () => disk, write: async (_, data) => { disk = data; } });
    for (const change of [{ css: 1 }, { css: "a".repeat(32001) }, { dismiss: "Extra app" }, { unexpected: true }]) {
      await expect(store.update("alice", change)).rejects.toThrow(); expect(disk).toEqual(defaultPreferences());
    }
    await expect(store.read("")).rejects.toThrow();
    expect(() => readPreferences({ css: "", dismissed: ["Fake"], revision: 0 })).toThrow();
  });
  test("contact rename updates presence, persists its marker and blocks the old AI name", () => {
    const doc = emptyDocument("a"); doc.edits.push(edit({ name: "Ada", rename: "Adaline", value: {} }));
    const rows = [row(0, { present: ["Ada", "Player"], contacts: [{ name: "Ada", roles: ["Guide"] }] }), row(1, { contacts: [{ name: "Ada", physical: "Fine" }] })];
    const result = replay(doc, rows, ["Player"]);
    expect(result.state.scene.present?.value).toEqual(["Adaline", "Player"]);
    expect(result.state.contacts.find(c => c.name === "Adaline")?.editedByUser).toBe(true);
    expect(result.state.contacts.some(c => c.name === "Ada")).toBe(false);
    expect(replay(readDocument(JSON.stringify(result), "a"), rows, ["Player"]).state).toEqual(result.state);
  });
  test("player spelling survives replay and renaming keeps private fields restricted", () => {
    const doc = emptyDocument("a"); doc.edits.push(edit({ name: "Player", rename: "Hero", value: {} }));
    const rows = [row(0, { present: ["Player"] }), row(1, { contacts: [{ name: "Hero", mood: "Happy", thoughts: "A secret", roles: ["Hero"], physical: "Healthy" }] })];
    const result = replay(doc, rows, ["Player"]); const player = result.state.contacts.find(c => c.name === "Hero")!;
    expect(result.playerNames).toEqual(["Player"]); expect(player.player).toBe(true);
    expect(player.fields.physical?.value).toBe("Healthy"); expect(player.fields.mood).toBeUndefined();
    expect(player.fields.thoughts).toBeUndefined(); expect(player.fields.roles).toBeUndefined();
  });
  test("renaming a location updates the current Scene and renaming a note preserves its flags", () => {
    const doc = emptyDocument("a");
    doc.edits.push(edit({ target: "location", name: "Cafe", rename: "Lantern Cafe", value: { description: "Quiet", relation: "" } }),
      edit({ target: "note", name: "Map", section: "misc", value: { detail: "Keep it", sendToAI: true } }),
      edit({ target: "note", name: "Map", rename: "Route map", section: "misc", value: { detail: "Keep it safe", sendToAI: true } }));
    const result = replay(doc, [row(0, { location: "Cafe", locations: [{ name: "Cafe" }] })], ["Player"]);
    expect(result.state.scene.location?.value).toEqual({ name: "Lantern Cafe", wider: [] });
    expect(result.state.scene.location?.by).toBe("user"); expect(result.state.locations[0].name).toBe("Lantern Cafe");
    expect(result.state.notes.misc.map(n => [n.name, n.addedByUser, n.sendToAI, n.updated])).toEqual([["Route map", true, true, true]]);
  });
  test("duplicate renames and editing private player fields fail safely", () => {
    const state = emptyState(); const players = new Set(["Player".toLowerCase()]); const tombstones = new Set<string>();
    applyManual(state, edit({ name: "Ada", value: {} }), players, tombstones);
    applyManual(state, edit({ name: "Bea", value: {} }), players, tombstones);
    expect(() => applyManual(state, edit({ name: "Ada", rename: "BEA", value: {} }), players, tombstones)).toThrow();
    expect(state.contacts.map(c => c.name)).toEqual(["Ada", "Bea"]);
    expect(() => applyManual(state, edit({ name: "Player", value: { mood: "Happy" } }), players, tombstones)).toThrow();
    expect(state.contacts.some(c => c.player)).toBe(false);
  });
});

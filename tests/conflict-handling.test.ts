import { expect, test } from "bun:test";
import { PhoneStore } from "../src/phone-store";
import { emptyDocument } from "../src/model";
import { failureDetails } from "../src/diagnostics";
import type { StoryRow } from "../src/engine";

const row = (i: number, content: string, role: "user" | "assistant" = "assistant"): StoryRow => ({
  id: `m${i}`,
  chat_id: "a",
  index_in_chat: i,
  role,
  name: role === "user" ? "Player" : "Ada",
  content,
  swipe_id: 0,
});

function fixture() {
  let raw = JSON.stringify(emptyDocument("a"));
  const rows: StoryRow[] = [row(0, "At Gate.<phone-state>loc: Gate\npresent: Ada; Player</phone-state>")];
  const io = {
    authorize: async (c: string, u: string) => c === "a" && ["u", "v"].includes(u),
    read: async () => raw,
    write: async (_c: string, v: string) => { raw = v; },
    history: async () => structuredClone(rows),
    player: async () => "Player",
    names: async () => ["Ada"],
  };
  return { store: new PhoneStore(io), rows, raw: () => raw };
}

test("edit racing a saved-message event fails with conflict.revision_mismatch and preserves new story state", async () => {
  const f = fixture();
  const opened = await f.store.sync("u", "a");
  const nextRow = row(1, "<phone-state>time: Midnight</phone-state>");
  f.rows.push(nextRow);
  const synced = await f.store.receiveSaved("u", "a", nextRow);
  expect(synced.revision).toBeGreaterThan(opened.revision);

  let caught: unknown;
  try {
    await f.store.update("u", "a", opened.revision, { edit: { target: "scene", field: "date", value: "Oct 31" } });
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(Error);
  expect((caught as Error).message).toBe("The tracker changed. Reopen it and try again.");
  expect(failureDetails(caught)).toEqual({ category: "conflict.revision_mismatch" });

  // Refreshed revision commits cleanly without dropping the incoming saved-message fact.
  const committed = await f.store.update("u", "a", synced.revision, { edit: { target: "scene", field: "date", value: "Oct 31" } });
  expect(committed.state.scene.time?.value).toBe("Midnight");
  expect(committed.state.scene.date?.value).toBe("Oct 31");
});

test("two users racing edits in a shared chat hit conflict.revision_mismatch without clobbering the first save", async () => {
  const f = fixture();
  const viewA = await f.store.openView("a", "u");
  const viewB = await f.store.openView("a", "v");
  expect(viewA.revision).toBe(viewB.revision);

  const afterA = await f.store.update("u", "a", viewA.revision, { settings: { inferMissing: true } });
  expect(afterA.settings.inferMissing).toBe(true);

  let caught: unknown;
  try {
    await f.store.update("v", "a", viewB.revision, { settings: { fakeAddresses: true } });
  } catch (error) {
    caught = error;
  }
  expect(failureDetails(caught)).toEqual({ category: "conflict.revision_mismatch" });
  expect(JSON.parse(f.raw()).settings.inferMissing).toBe(true);
  expect(JSON.parse(f.raw()).settings.fakeAddresses).toBe(false);

  // User B re-applies against the refreshed revision while preserving User A's setting.
  const afterB = await f.store.update("v", "a", afterA.revision, { settings: { fakeAddresses: true } });
  expect(afterB.settings.inferMissing).toBe(true);
  expect(afterB.settings.fakeAddresses).toBe(true);
});

test("retrying a partial contactInfo edit on the latest revision preserves concurrently added phone numbers", async () => {
  const f = fixture();
  const opened = await f.store.sync("u", "a");

  // Another update adds Ada's phone number while the first user only edits relationship.
  const withPhone = await f.store.update("v", "a", opened.revision, {
    contactInfo: { name: "Ada", phone: "555-0199" },
  });
  expect(withPhone.contactInfo?.ada?.phone).toBe("555-0199");

  // Stale revision is rejected.
  await expect(
    f.store.update("u", "a", opened.revision, { contactInfo: { name: "Ada", relationship: "Rival" } })
  ).rejects.toThrow("The tracker changed.");

  // Retrying with only the changed field (omitting untouched phone) preserves the newer phone number.
  const merged = await f.store.update("u", "a", withPhone.revision, {
    contactInfo: { name: "Ada", relationship: "Rival" },
  });
  expect(merged.contactInfo?.ada?.phone).toBe("555-0199");
  expect(merged.contactInfo?.ada?.relationship).toBe("Rival");
});

test("un-synced story history drift clears ready state so openView refreshes instead of looping on stale data", async () => {
  const f = fixture();
  const opened = await f.store.sync("u", "a");
  const beforeRaw = f.raw();

  // History advances without updating the saved tracker revision yet (chat is still marked ready).
  f.rows.push(row(1, "<phone-state>loc: Courtyard</phone-state>"));

  let caught: unknown;
  try {
    await f.store.update("u", "a", opened.revision, { edit: { target: "scene", field: "time", value: "Noon" } });
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(Error);
  expect((caught as Error).message).toBe("The story changed. Reopen the tracker and try again.");
  expect(failureDetails(caught)).toEqual({ category: "conflict.accepted_state_drift" });
  expect(f.raw()).toBe(beforeRaw);

  // Follow-up openView() (triggered by phone_sync on conflict) must rebuild and advance revision.
  const refreshed = await f.store.openView("a", "u");
  expect(refreshed.revision).toBeGreaterThan(opened.revision);
  expect(refreshed.state.scene.location?.value).toEqual({ name: "Courtyard", wider: [] });

  // Saving against the refreshed snapshot now succeeds without looping.
  const committed = await f.store.update("u", "a", refreshed.revision, {
    edit: { target: "scene", field: "time", value: "Noon" },
  });
  expect(committed.state.scene.location?.value).toEqual({ name: "Courtyard", wider: [] });
  expect(committed.state.scene.time?.value).toBe("Noon");
});

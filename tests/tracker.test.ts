import { describe, expect, test } from "bun:test";
import { parseBlock, parseReply } from "../src/parser";
import { readSnapshot, rebuild, type HistoryMessage, type ChatSnapshot } from "../src/history";
import { DEFAULT_ITEMS, enabledPatch } from "../src/shared";
import { chatPath, TrackerStore, type TrackerIO } from "../src/store";
import { decodeEntities, parseAttributes, stripHistoryTags, transformTags } from "../src/tags";

const block = (body: string) => `<phone-state>\n${body}\n</phone-state>`;
function row(index: number, content: string, other: Partial<HistoryMessage> = {}): HistoryMessage {
  return { id: `m${index}`, chat_id: "a", index_in_chat: index, role: "assistant", content, swipe_id: 0, ...other };
}

describe("compact tracker contract", () => {
  test("changed fields only, quotes and JSON arrays", () => {
    expect(parseBlock('location="Cafe"\npresent=["Ada","Ben"]\nnotes=["Meet at dusk"]')).toEqual({ location: "Cafe", present: ["Ada", "Ben"], notes: ["Meet at dusk"] });
  });
  test("unknown/null never erases known fields", () => {
    expect(parseBlock('time=null\nweather=null')).toEqual({});
  });
  test("explicit established clear uses empty string or array", () => {
    expect(parseBlock('present=[]\nnotes=[]\ndetails=""')).toEqual({ present: [], notes: [], details: "" });
  });
  for (const bad of ['location=Cafe', 'location="A"\nlocation="B"', 'unexpected="x"', 'present="Ada"', 'notes=[1]', 'notes=[""]', 'details="a\\nb"', '__proto__={}', `location="${"a".repeat(241)}"`, "x".repeat(8001)]) {
    test(`reject malformed block: ${bad.slice(0, 45)}`, () => expect(parseBlock(bad)).toBeNull());
  }
  test("multiple tracker blocks are rejected together", () => {
    const parsed = parseReply(block('location="A"') + block('location="B"'));
    expect(parsed.invalidTracker).toBe(true); expect(parsed.patch).toEqual({});
  });
  test("text identity and optional story time, not invented device time", () => {
    expect(parseReply('<phone-text from="Ada">See you soon.</phone-text>').texts).toEqual([{ from: "Ada", text: "See you soon." }]);
    expect(parseReply('<phone-text from="Ada" time="dusk">Hi</phone-text>').texts[0].time).toBe("dusk");
  });
  test("malformed text does not erase valid tracker", () => {
    const parsed = parseReply('<phone-text>bad</phone-text>' + block('time="Night"'));
    expect(parsed.invalidTexts).toBe(true); expect(parsed.patch.time).toBe("Night");
  });
  test("bounded text and strict attributes", () => {
    for (const tag of ['<phone-text from=Bad>x</phone-text>', '<phone-text from="Ada" from="Ben">x</phone-text>', '<phone-text from="Ada" reply="yes">x</phone-text>', '<phone-text from="Ada"><script>x</script></phone-text>']) expect(parseReply(tag).invalidTexts).toBe(true);
  });
  test("entity decoding is one pass", () => {
    expect(decodeEntities("&amp;lt; &quot;x&quot;")).toBe('&lt; "x"');
    expect(parseAttributes(' from="A &amp; B"')).toEqual({ from: "A & B" });
    expect(parseReply('<phone-text from="Ada">&lt;3 &amp; hugs</phone-text>').texts[0].text).toBe("<3 & hugs");
  });
  test("individual item filtering foundation", () => {
    expect(enabledPatch({ location: "A", time: "Night", details: "Quiet" }, { ...DEFAULT_ITEMS, time: false })).toEqual({ location: "A", details: "Quiet" });
  });
});

describe("display and outgoing prompt", () => {
  test("complete canonical tags remain for registerTagInterceptor", () => {
    const text = `Story. ${block('location="A"')}<phone-text from="Ada">Hi</phone-text>`;
    expect(transformTags(text, "display")).toBe(text);
    expect(transformTags(text, "strip")).toBe("Story. ");
  });
  test("every partial opening name is withheld", () => {
    for (const tag of ["<phone-state", "<phone-text"]) {
      for (let i = 1; i <= tag.length; i++) expect(transformTags(`Story.${tag.slice(0, i)}`, "display")).toBe("Story.");
    }
  });
  test("unfinished payload and closing tag never leak", () => {
    for (const suffix of ['<phone-state>location="Secret"', '<phone-state>location="Secret"</phone-st', '<phone-text from="Ada">Secret', '<phone-text from="Ada', '</phone-text>']) {
      expect(transformTags(`Story.${suffix}`, "display")).toBe("Story.");
    }
  });
  test("broken attrs, uppercase tags, and nested reserved tags are hidden by render processor", () => {
    for (const tag of ['<phone-text from=A>x</phone-text>', '<PHONE-STATE>bad</PHONE-STATE>', '<phone-state><phone-text from="A">x</phone-text></phone-state>']) expect(transformTags(`Before${tag}After`, "display")).toBe("BeforeAfter");
  });
  test("ordinary angle brackets and HTML survive", () => {
    expect(transformTags("A < B. <p>Paragraph</p>", "display")).toBe("A < B. <p>Paragraph</p>");
  });
  test("strip only documented history messages; preserve system writing instructions", () => {
    const text = block('location="A"');
    const input = [
      { role: "system" as const, content: `Instructions: ${text}` },
      { role: "assistant" as const, content: `Story${text}`, __isChatHistory: true, sourceMessageId: "m1" },
    ];
    const before = JSON.stringify(input);
    const output = stripHistoryTags(input);
    expect(output[0]).toBe(input[0]); expect(output[1].content).toBe("Story");
    expect(output[1].sourceMessageId).toBe("m1"); expect(JSON.stringify(input)).toBe(before);
  });
  test("multipart text stripping preserves media and other parts", () => {
    const image = { type: "image" as const, data: "abc", mime_type: "image/png" };
    const output = stripHistoryTags([{ role: "assistant", __isChatHistory: true, content: [
      { type: "text", text: "Story<phone-st" }, { type: "text", text: 'ate>time="Night"</phone-state>' }, image,
    ] }]);
    expect(output[0].content).toEqual([{ type: "text", text: "Story" }, image]);
  });
});

describe("authoritative active history", () => {
  const older = row(0, block('location="Old"\nweather="Rain"'));
  const newer = row(1, block('location="New"'));
  test("old render order cannot replace newer data", () => {
    expect(rebuild("a", [newer, older]).tracker).toEqual({ location: "New", weather: "Rain" });
  });
  test("user and system tags are not accepted as AI updates", () => {
    expect(rebuild("a", [row(0, block('location="No"'), { role: "user" }), row(1, block('time="No"'), { role: "system" })]).tracker).toEqual({});
  });
  test("deleting the latest source restores prior fact", () => {
    const first = rebuild("a", [older, newer]);
    expect(rebuild("a", [older], first).tracker.location).toBe("Old");
  });
  test("malformed edit preserves previous valid patch for the same source", () => {
    const first = rebuild("a", [older, newer]);
    expect(rebuild("a", [older, { ...newer, content: block('location=broken') }], first).tracker.location).toBe("New");
  });
  test("a saved half-written tag never replaces confirmed same-variant data", () => {
    const first = rebuild("a", [older, newer]);
    for (const content of ["Story<phone-st", 'Story<phone-state>location="Partial"']) {
      expect(rebuild("a", [older, { ...newer, content }], first).tracker.location).toBe("New");
    }
  });
  test("removing the tag removes its contribution", () => {
    const first = rebuild("a", [older, newer]);
    expect(rebuild("a", [older, { ...newer, content: "Story only" }], first).tracker.location).toBe("Old");
  });
  test("regeneration and swipe replace data and text, without duplicate messages", () => {
    const a = row(1, block('location="A"') + '<phone-text from="Ada">One</phone-text>');
    const first = rebuild("a", [older, a]);
    const b = { ...a, swipe_id: 1, content: block('location="B"') + '<phone-text from="Ben">Two</phone-text>' };
    const second = rebuild("a", [older, b], first);
    expect(second.tracker.location).toBe("B"); expect(second.texts.map(t => t.from)).toEqual(["Ben"]);
    expect(rebuild("a", [older, b], second)).toEqual(second);
    expect(rebuild("a", [older, a], second).texts.map(t => t.from)).toEqual(["Ada"]);
  });
  test("malformed different swipe never retains facts from the unselected swipe", () => {
    const first = rebuild("a", [older, newer]);
    expect(rebuild("a", [older, { ...newer, swipe_id: 1, content: block("bad") }], first).tracker.location).toBe("Old");
  });
  test("round trip, stale derived data ignored, wrong-chat rejection", () => {
    const first = rebuild("a", [older, newer]);
    expect(readSnapshot({ ...first, tracker: { location: "Injected" } }, "a")).toEqual(first);
    expect(() => readSnapshot(first, "b")).toThrow();
    expect(() => rebuild("a", [{ ...older, chat_id: "b" }])).toThrow();
    expect(() => rebuild("a", [older, older])).toThrow();
  });
});

describe("per-user per-chat persistence", () => {
  function fixture() {
    const saved = new Map<string, unknown>();
    const histories = new Map<string, HistoryMessage[]>();
    const io: TrackerIO = {
      authorize: async () => true,
      history: async (user, chat) => structuredClone(histories.get(`${user}/${chat}`) ?? []),
      read: async (user, path) => structuredClone(saved.get(`${user}/${path}`) ?? null),
      write: async (user, path, value) => { saved.set(`${user}/${path}`, structuredClone(value)); },
    };
    return { saved, histories, io, store: new TrackerStore(io) };
  }
  test("chat switches and restart cannot share data", async () => {
    const f = fixture();
    f.histories.set("u/a", [row(0, block('location="A"'))]);
    f.histories.set("u/b", [row(0, block('location="B"'), { chat_id: "b" })]);
    expect((await f.store.sync("u", "a")).tracker.location).toBe("A");
    expect((await f.store.sync("u", "b")).tracker.location).toBe("B");
    expect((await new TrackerStore(f.io).sync("u", "a")).tracker.location).toBe("A");
    expect((await f.store.sync("other-user", "a")).tracker).toEqual({});
  });
  test("serialized requests cannot overwrite newer history with an earlier response", async () => {
    const f = fixture();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let calls = 0;
    f.io.history = async () => { calls++; if (calls === 1) { await gate; return [row(0, block('location="Old"'))]; } return [row(0, block('location="New"'))]; };
    const first = f.store.sync("u", "a"); const second = f.store.sync("u", "a"); release();
    await Promise.all([first, second]);
    expect((f.saved.get(`u/${chatPath("a")}`) as ChatSnapshot).tracker.location).toBe("New");
  });
  test("failed history read keeps persisted data and can recover", async () => {
    const f = fixture(); f.histories.set("u/a", [row(0, block('location="Safe"'))]); await f.store.sync("u", "a");
    const before = JSON.stringify([...f.saved]);
    const history = f.io.history; f.io.history = async () => { throw new Error("Unavailable"); };
    await expect(f.store.sync("u", "a")).rejects.toThrow(); expect(JSON.stringify([...f.saved])).toBe(before);
    f.io.history = history; expect((await f.store.sync("u", "a")).tracker.location).toBe("Safe");
  });
  test("missing context or denied ownership cannot read or save", async () => {
    const f = fixture(); f.io.authorize = async () => false;
    await expect(f.store.sync("u", "a")).rejects.toThrow();
    await expect(f.store.sync("", "a")).rejects.toThrow(); expect(f.saved.size).toBe(0);
  });
  test("path traversal characters never become directories", () => {
    expect(chatPath("../../b")).not.toContain(".."); expect(chatPath("../../b").split("/").length).toBe(2);
  });
});

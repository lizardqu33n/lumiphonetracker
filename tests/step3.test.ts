import { describe, expect, test } from "bun:test";
import { emptyDocument, defaults, SECTIONS, SWITCHES, type Document, type ManualEdit } from "../src/model";
import { parseExpanded, parseExpandedReply, validateExpanded } from "../src/schema";
import { SkipLogger } from "../src/diagnostics";
import { replay, type StoryRow } from "../src/engine";
import { PhoneStore, readDocument, type PhoneIO } from "../src/phone-store";
import { MACRO_NAMES, registerPhoneMacros, registerPhoneMacroTemplates, renderMacro } from "../src/phone-macros";
import { trimPhoneHistory } from "../src/retention";
import { rebuild } from "../src/history";

const block = (data: Record<string, unknown>) => `<phone-state>\n${Object.entries(data).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join("\n")}\n</phone-state>`;
const row = (index: number, data: Record<string, unknown> = {}, prose = "Ada is in the Cafe.", extra: Partial<StoryRow> = {}): StoryRow => ({
  id: `m${index}`, chat_id: "a", index_in_chat: index, role: "assistant", content: prose + block(data), swipe_id: 0, ...extra,
});
const run = (rows: StoryRow[], doc = emptyDocument("a")) => replay(doc, rows, ["Player"]);
const edit = (target: ManualEdit["target"], more: Partial<ManualEdit>): ManualEdit => ({ id: "e", target, after: "m0", index: 0, ...more });

describe("expanded schema and state", () => {
  test("skip diagnostics report safe fields, line numbers and fixed reasons without values", () => {
    const content = '<phone-state>\ntime="Night"\nweather=private-secret\nprivate-field-name=123\ndate="A"\ndate="B"\n</phone-state>';
    const result = parseExpandedReply(content);
    expect(result.issues.map(i => [i.line, i.field, i.reason])).toEqual([
      [3, "weather", "invalid JSON"], [4, "(unknown)", "unknown or forbidden field"],
      [5, "date", "duplicate or conflicting field"], [6, "date", "duplicate or conflicting field"],
    ]);
    expect(JSON.stringify(result.issues)).not.toContain("private-secret");
    expect(JSON.stringify(result.issues)).not.toContain("private-field-name");
    expect(result.patch?.scene.time?.value).toBe("Night");
  });
  test("skip logger suppresses replay repeats and allows a new warning after correction", () => {
    const logs: string[] = []; const logger = new SkipLogger(text => logs.push(text));
    const bad = row(0, {}, "", { content: '<phone-state>weather=private-secret</phone-state>' });
    const issues = parseExpandedReply(bad.content).issues;
    logger.record("a", bad, issues); logger.record("a", bad, issues);
    expect(logs.length).toBe(1); expect(logs[0]).toContain('"messageId":"m0"');
    expect(logs[0]).not.toContain("private-secret");
    logger.record("a", { ...bad, content: block({ weather: "Rain" }) }, []);
    logger.record("a", bad, issues); expect(logs.length).toBe(2);
  });
  test("full changed-field schema and nulls", () => {
    const patch = validateExpanded({ location: { name: "Cafe", wider: ["Town"] }, time: "dusk", date: "Monday",
      present: ["Ada", "Player"], weather: "rain", contacts: [{ name: "Ada", roles: ["captain", "friend"], attire: { worn: ["blue wool coat"], removed: [] } }],
      locations: [{ name: "Cafe", description: "A quiet room" }], rules: [{ name: "Door", detail: "Keep it shut", context: "Ada said so" }] });
    expect(patch.scene.location?.value).toEqual({ name: "Cafe", wider: ["Town"] });
  });
  test("reject invalid whole block, AI Misc/deletion/partial attire", () => {
    for (const raw of [{ misc: [{ name: "No" }] }, { contacts: [{ name: "Ada", attire: { worn: [] } }] },
      { rules: [{ name: "Rule", delete: true }] }, { people: [{ name: "Ada", resolved: true }] }, { details: "removed" }]) expect(() => validateExpanded(raw)).toThrow();
    expect(parseExpanded('time="Night"\ntime="Day"')).toBeNull();
  });
  test("valid lines survive invalid lines, while arrays remain atomic", () => {
    const p = parseExpanded('time="Dusk"\nweather=broken\ncontacts=[{"name":"Ada","mood":"calm"},{"name":"Ben","attire":{"worn":[]}}]\ndate="Monday"');
    expect(p?.scene.time?.value).toBe("Dusk"); expect(p?.scene.date?.value).toBe("Monday");
    expect(p?.weather).toBeUndefined(); expect(p?.contacts).toEqual([]);
  });
  test("all duplicate lines for a field are dropped without losing unrelated fields", () => {
    const p = parseExpanded('time="Night"\ntime="Day"\nweather="Rain"');
    expect(p?.scene.time).toBeUndefined(); expect(p?.weather?.value).toBe("Rain");
    expect(parseExpanded('time="Night"\nunknown=123')?.scene.time?.value).toBe("Night");
  });
  test("here now is names only; absent contacts retain values; date/weather separate", () => {
    const doc = run([row(0, { location: "Cafe", date: "Monday", present: ["Ada"], weather: "rain", contacts: [{ name: "Ada", mood: "calm" }] }),
      row(1, { present: [], location: "Road" })]);
    expect(doc.state.contacts.find(c => c.name === "Ada")?.fields.mood?.value).toBe("calm");
    expect(doc.state.contacts.find(c => c.name === "Ada")?.lastSeen).toBe("Cafe");
    expect(doc.state.scene.date?.value).toBe("Monday"); expect(doc.state.weather?.value).toBe("rain");
    expect(renderMacro("phone_scene", doc)).not.toContain("calm");
  });
  test("AI-populated contact fields accept later story changes without a quote", () => {
    const rows = [row(0, { present: ["Ada"], contacts: [{ name: "Ada", mood: "calm" }] }), row(1, { contacts: [{ name: "Ada", mood: "angry" }] })];
    expect(run(rows).state.contacts.find(c => c.name === "Ada")?.fields.mood?.value).toBe("angry");
    rows[1] = row(1, { contacts: [{ name: "Ada", mood: { value: "angry", evidence: "Ada becomes angry." } }] }, "Ada becomes angry.");
    expect(run(rows).state.contacts.find(c => c.name === "Ada")?.fields.mood?.value).toBe("angry");
  });
  test("complete attire replacement can move an item from Worn to Removed", () => {
    const result = run([row(0, { present: ["Ada"], contacts: [{ name: "Ada", attire: { worn: ["blue wool coat"], removed: [] } }] }),
      row(1, { contacts: [{ name: "Ada", attire: { value: { worn: [], removed: ["blue wool coat"] }, evidence: "Ada removes the blue wool coat." } }] }, "Ada removes the blue wool coat.")]);
    expect(result.state.contacts.find(c => c.name === "Ada")?.fields.attire?.value).toEqual({ worn: [], removed: ["blue wool coat"] });
  });
  test("inference off, explicit marker on, never re-infer a populated field", () => {
    const rows = [row(0, { present: ["Ada"], contacts: [{ name: "Ada", physical: { value: "scarred left hand", inferred: true } }] })];
    expect(run(rows).state.contacts.find(c => c.name === "Ada")?.fields.physical).toBeUndefined();
    const doc = emptyDocument("a"); doc.settings.inferMissing = true;
    const inferred = run(rows, doc).state.contacts.find(c => c.name === "Ada")?.fields.physical;
    expect(inferred?.inferred).toBe(true);
  });
  test("player only physical/position/attire, including authored user edits", () => {
    const rows = [row(0, { present: ["Player"], contacts: [{ name: "Player", roles: ["hero"], mood: "happy", thoughts: "secret", physical: "unhurt" }] })];
    const doc = run(rows); const player = doc.state.contacts.find(c => c.player)!;
    expect(Object.keys(player.fields).filter(k => player.fields[k as keyof typeof player.fields])).toEqual(["physical"]);
    doc.edits.push(edit("contact", { name: "Player", value: { mood: "happy" } }));
    expect(() => run(rows, doc)).toThrow();
  });
  test("case-insensitive place merging, current and three other relevant places", () => {
    const doc = run([row(0, { location: "Cafe", locations: ["Cafe", "Road", "Inn", "Park", "Tower"].map(name => ({ name, description: name })) }, "Cafe Road Inn Park Tower"),
      row(1, { locations: [{ name: " road ", description: "updated" }] })]);
    expect(doc.state.locations.length).toBe(4); expect(doc.state.locations[0].description).toBe("updated");
    expect(renderMacro("phone_locations", doc).split("\n").length).toBe(4);
  });
  test("30 contact/place caps reject additions and never prune entries", () => {
    const names = Array.from({ length: 32 }, (_, i) => `Person${i}`);
    const doc = run([row(0, { present: names, contacts: names.map(name => ({ name, roles: ["friend"] })), locations: names.map(name => ({ name })) }, names.join(" "))]);
    expect(doc.state.contacts.length).toBe(30); expect(doc.state.locations.length).toBe(30);
    expect(doc.state.notices.some(n => n.startsWith("Contacts is full"))).toBe(true);
    expect(doc.state.notices.some(n => n.startsWith("Locations is full"))).toBe(true);
  });
});

describe("user corrections and story log", () => {
  test("user correction survives stale later values, but accepts evidenced new scene", () => {
    const doc = emptyDocument("a"); doc.edits.push(edit("scene", { field: "location", value: "Home" }));
    const rows = [row(0, { location: "Cafe" }), row(1, { location: "Cafe" })];
    expect((run(rows, doc).state.scene.location?.value as { name: string }).name).toBe("Home");
    rows[1] = row(1, { location: { value: "Road", evidence: "They leave Home for the Road." } }, "They leave Home for the Road.");
    expect((run(rows, doc).state.scene.location?.value as { name: string }).name).toBe("Road");
  });
  test("same-source malformed changes preserve confirmed data, swipe switches rebuild", () => {
    const rows = [row(0, { location: "Cafe" }), row(1, { location: "Road" })]; const first = run(rows);
    expect((run([rows[0], { ...rows[1], content: "<phone-state>broken</phone-state>" }], first).state.scene.location?.value as { name: string }).name).toBe("Road");
    expect((run([rows[0], { ...rows[1], swipe_id: 1, content: "No tracker" }], first).state.scene.location?.value as { name: string }).name).toBe("Cafe");
  });
  test("partial malformed edit preserves that source's rejected field and accepts its valid field", () => {
    const rows = [row(0, { time: "Night", weather: "Rain" })]; const first = run(rows);
    const content = '<phone-state>\ntime="Dawn"\nweather=broken\n</phone-state>';
    const updated = run([{ ...rows[0], content }], first);
    expect(updated.state.scene.time?.value).toBe("Dawn"); expect(updated.state.weather?.value).toBe("Rain");
    expect(run([{ ...rows[0], content }], updated).state.weather?.value).toBe("Rain");
  });
  test("a bad line in a new message retains the older value without blocking other changes", () => {
    const result = run([row(0, { time: "Night", weather: "Rain" }), row(1, {}, "", {
      content: '<phone-state>\ntime="Dawn"\nweather=broken\n</phone-state>',
    })]);
    expect(result.state.scene.time?.value).toBe("Dawn"); expect(result.state.weather?.value).toBe("Rain");
  });
  test("user-edited contact still needs quoted evidence after normal AI fields become quote-free", () => {
    const doc = emptyDocument("a"); doc.edits.push(edit("contact", { name: "Ada", value: { physical: "bandaged hand" } }));
    const rows = [row(0, { present: ["Ada"], contacts: [{ name: "Ada", physical: "unhurt" }] }), row(1, { contacts: [{ name: "Ada", physical: "healed hand" }] })];
    expect(run(rows, doc).state.contacts.find(c => c.name === "Ada")?.fields.physical?.value).toBe("bandaged hand");
    rows[1] = row(1, { contacts: [{ name: "Ada", physical: { value: "healed hand", evidence: "Ada shows her healed hand." } }] }, "Ada shows her healed hand.");
    expect(run(rows, doc).state.contacts.find(c => c.name === "Ada")?.fields.physical?.value).toBe("healed hand");
  });
  test("notes update by name, mark Updated, resolve without deleting; AI cannot delete", () => {
    const doc = run([row(0, { plots: [{ name: "Meeting", detail: "at dusk", context: "Ada invited Player" }] }),
      row(1, { plots: [{ name: "meeting", detail: "done", resolved: true }] })]);
    expect(doc.state.notes.plots.length).toBe(1); expect(doc.state.notes.plots[0].updated).toBe(true);
    expect(doc.state.notes.plots[0].resolved).toBe(true); expect(renderMacro("phone_notes", doc)).toBe("");
  });
  test("full sections reject additions but permit updates; full hint disappears when not full", () => {
    const doc = emptyDocument("a"); doc.settings.notesPerSection = 3;
    const rows = [row(0, { people: [0, 1, 2, 3].map(i => ({ name: `Person${i}`, detail: "returns tomorrow" })) }),
      row(1, { people: [{ name: "person0", detail: "returns tonight" }] })];
    const result = run(rows, doc); expect(result.state.notes.people.length).toBe(3);
    expect(result.state.notes.people[0].detail).toBe("returns tonight");
    expect(renderMacro("phone_format", result)).toContain("Full sections (updates only): people");
    expect(renderMacro("phone_format", emptyDocument("a"))).not.toContain("Full sections");
  });
  test("lowering the section cap never hides previously admitted notes", () => {
    const rows = [row(0, { people: [0, 1, 2, 3, 4].map(i => ({ name: `Person${i}` })) })];
    const first = run(rows); first.settings.notesPerSection = 3;
    expect(run(rows, first).state.notes.people.length).toBe(5);
  });
  test("Misc user-only and opt-in, user-added/edit markers, deleted notes stay deleted", () => {
    const doc = emptyDocument("a");
    doc.edits.push(edit("note", { section: "misc", name: "Private", value: { detail: "not for AI" } }),
      edit("note", { id: "e2", section: "misc", name: "Shared", value: { detail: "for AI", sendToAI: true } }));
    const result = run([row(0)], doc);
    expect(result.state.notes.misc[0].addedByUser).toBe(true);
    expect(renderMacro("phone_notes", result)).not.toContain("Private"); expect(renderMacro("phone_notes", result)).toContain("Shared");
    const removed = emptyDocument("a"); removed.edits.push(edit("note", { section: "rules", name: "Door", remove: true }));
    expect(run([row(0, { rules: [{ name: "Door", detail: "closed" }] }), row(1, { rules: [{ name: "Door", detail: "closed" }] })], removed).state.notes.rules).toEqual([]);
  });
  test("rules then open plots then recent people/items, configurable macro cap", () => {
    const doc = run([row(0, { people: [{ name: "Ada" }], items: [{ name: "Map" }], rules: [{ name: "Door" }], plots: [{ name: "Meet" }] })]);
    doc.settings.logLines = 2;
    expect(renderMacro("phone_notes", doc).split("\n").map(s => s.split(":")[0])).toEqual(["rules", "plots"]);
    expect(doc.state.notes.people.length).toBe(1);
  });
});

describe("text authorship and retention", () => {
  test("AI cannot write player texts by default; user written tags are outgoing", () => {
    const rows = [row(0, {}, "", { content: '<phone-text from="Player">Fake</phone-text><phone-text from="Ada">Hi</phone-text>' }),
      row(1, {}, "", { role: "user", name: "Player", content: '<phone-text from="Player" to="Ada">Hello</phone-text>' })];
    const doc = run(rows);
    expect(doc.state.messages.map(m => [m.from, m.direction])).toEqual([["Ada", "incoming"], ["Player", "outgoing"]]);
    const enabled = emptyDocument("a"); enabled.settings.aiPlayerTexts = true;
    expect(run(rows, enabled).state.messages.length).toBe(3);
  });
  test("user role cannot spoof an NPC or write tracker updates", () => {
    const doc = run([row(0, { location: "Wrong" }, "", { role: "user", name: "Player", content: block({ location: "Wrong" }) + '<phone-text from="Ada">Spoof</phone-text>' })]);
    expect(doc.state.scene.location).toBeUndefined(); expect(doc.state.messages).toEqual([]);
  });
  test("recent texts default 3, tracker default 0; saved source stays unchanged", () => {
    const rows = Array.from({ length: 5 }, (_, i) => row(i, { time: `${i}` }, "", { content: block({ time: `${i}` }) + `<phone-text from="Ada">${i}</phone-text>` }));
    const doc = run(rows); const messages = rows.map(r => ({ role: r.role, content: r.content, __isChatHistory: true, sourceMessageId: r.id, sourceIndexInChat: r.index_in_chat }));
    const original = JSON.stringify(messages); const trimmed = trimPhoneHistory(messages, doc.settings, doc);
    expect(trimmed.filter(m => String(m.content).includes("phone-text")).length).toBe(3);
    expect(trimmed.some(m => String(m.content).includes("phone-state"))).toBe(false);
    doc.settings.keepTrackers = 1; doc.settings.keepTexts = 4;
    const next = trimPhoneHistory(messages, doc.settings, doc);
    expect(next.filter(m => String(m.content).includes("phone-state")).length).toBe(1);
    expect(next.filter(m => String(m.content).includes("phone-text")).length).toBe(4);
    expect(JSON.stringify(messages)).toBe(original);
  });
  test("rejected AI player texts never survive recent retention", () => {
    const rows = [row(0, {}, "", { content: '<phone-text from="Player">Fake</phone-text>' })]; const doc = run(rows);
    expect(trimPhoneHistory([{ role: "assistant", content: rows[0].content, __isChatHistory: true, sourceMessageId: "m0" }], doc.settings, doc)[0].content).toBe("");
  });
});

describe("macros and persistent isolation", () => {
  test("each off switch removes its macro data and its writing request", () => {
    const doc = run([row(0, { location: "Cafe", time: "dusk", date: "Monday", present: ["Ada"], weather: "rain", contacts: [{ name: "Ada", mood: "calm" }] })]);
    for (const key of SWITCHES) doc.settings.enabled[key] = false;
    for (const name of MACRO_NAMES) expect(renderMacro(name, doc)).toBe("");
    doc.settings.enabled["scene.time"] = true;
    const format = renderMacro("phone_format", doc); expect(format).toContain('time: known time');
    expect(format).not.toContain("Cafe"); expect(format).not.toContain('"mood":'); expect(format).not.toContain("phone-text");
  });
  test("Helper mode emits no main tracker writing instructions and never generates", () => {
    const doc = emptyDocument("a"); doc.settings.source = "helper";
    const format = renderMacro("phone_format", doc);
    expect(format).toContain("Do not write a phone-state block"); expect(format).not.toContain("key=JSON");
    expect(format).not.toContain("Record narrated changes in the block");
  });
  test("macro outputs cannot invoke other native macros", () => {
    const doc = run([row(0, { rules: [{ name: "{{setvar::x::bad}}", detail: "literal story text" }] })]);
    expect(renderMacro("phone_notes", doc)).not.toContain("{{");
  });
  test("pull handlers register names only, require trusted chat context, and fail closed", async () => {
    const handlers = new Map<string, (ctx: Record<string, unknown>) => Promise<string>>(); const loads: string[] = [];
    const api = { registerMacro: (d: { name: string; handler: (ctx: Record<string, unknown>) => Promise<string>; volatile: boolean }) => {
      expect(d.volatile).toBe(true); handlers.set(d.name, d.handler);
    }, log: { warn: () => {} } };
    registerPhoneMacros(api as never, async chat => { loads.push(chat); if (chat === "bad") throw new Error();
      return replay(emptyDocument(chat), [{ ...row(0, { time: chat }), chat_id: chat }], ["Player"]); });
    expect([...handlers.keys()]).toEqual([...MACRO_NAMES]);
    expect(await handlers.get("phone_scene")!({ commit: false })).toBe(""); expect(loads).toEqual([]);
    expect(await handlers.get("phone_scene")!({ chatId: "a", userId: "owner-a", commit: false })).toBe("time: a");
    expect(await handlers.get("phone_scene")!({ chatId: "b", userId: "owner-b" })).toBe("time: b");
    expect(await handlers.get("phone_scene")!({ chatId: "bad", userId: "owner-bad" })).toBe("");
  });
  test("empty Main AI chats emit enabled writing instructions independently of continuity", () => {
    const doc=emptyDocument("new-chat");
    expect(renderMacro("phone_scene",doc)).toBe("");
    expect(renderMacro("phone_weather",doc)).toBe("");
    expect(renderMacro("phone_notes",doc)).toBe("");
    expect(renderMacro("phone_messages",doc)).toBe("");
    expect(renderMacro("phone_format",doc)).toContain("End each reply with <phone-state>");
    for(const key of SWITCHES)doc.settings.enabled[key]=false;
    doc.settings.enabled.weather=true;
    const text=renderMacro("phone_format",doc);
    expect(text).toContain('weather: known weather');
    expect(text).not.toContain('location={');expect(text).not.toContain('contacts=[');expect(text).not.toContain('Actual sent texts only');
    doc.settings.source="helper";
    expect(renderMacro("phone_format",doc)).toContain("Do not write a phone-state block");
    expect(renderMacro("phone_format",doc)).not.toContain("End each reply with");
  });
  test("documented macro template context resolves missing pull chat/user and reports exact empty reasons", async () => {
    let handler: (ctx:any)=>Promise<any> = async()=>undefined;
    const warnings:string[]=[];let allowed=true;let loads=0;
    const doc=emptyDocument("a");
    const api={registerMacroInterceptor:(fn:typeof handler)=>{handler=fn;},permissions:{has:()=>allowed},log:{warn:(s:string)=>warnings.push(s)}};
    registerPhoneMacroTemplates(api as never,async(chat,user)=>{loads++;expect(chat).toBe("a");expect(user).toBe("u");return doc;});
    const ctx={template:"Before {{phone_format}} After {{char}}",commit:false,userId:"u",phase:"prompt",env:{chat:{id:"a"},dynamicMacros:{}}};
    const result=await handler(ctx);
    expect(result.text).toContain("End each reply with <phone-state>");expect(result.text).toContain("After {{char}}");expect(result.volatile).toBe(true);
    expect(loads).toBe(1);expect(warnings).toEqual([]);
    for(const [bad,reason] of [[{userId:undefined},"no userId"],[{env:{chat:{},dynamicMacros:{}}},"no chat"]] as const) {
      const prior=loads;const output=await handler({...ctx,...bad});expect(output.text).toBe("Before  After {{char}}");expect(loads).toBe(prior);
      expect(warnings.at(-1)).toBe(`Lumi Phone Tracker: phone_format empty: ${reason}.`);
    }
    allowed=false;await handler(ctx);expect(warnings.at(-1)).toBe("Lumi Phone Tracker: phone_format empty: extension setting.");allowed=true;
    for(const key of SWITCHES)doc.settings.enabled[key]=false;
    await handler(ctx);expect(warnings.at(-1)).toBe("Lumi Phone Tracker: phone_format empty: all items off.");
    doc.settings.source="helper";await handler(ctx);expect(warnings.at(-1)).toBe("Lumi Phone Tracker: phone_format empty: Helper AI mode.");
    doc.settings.enabled.messages=true;
    const helper=await handler(ctx);expect(helper.text).toContain("Actual sent texts only");expect(helper.text).not.toContain("End each reply with");
    const count=loads;expect(await handler({...ctx,template:"{{unrelated}}"})).toBeUndefined();
    expect(await handler({...ctx,env:{...ctx.env,dynamicMacros:{phone_format:"Preset override"}}})).toBeUndefined();expect(loads).toBe(count);
  });
  test("preset pull RPC uses source-verified host environment, never arguments or conflicting identities", async () => {
    const handlers=new Map<string,(ctx:any)=>Promise<string>>();const calls:string[]=[];const warnings:string[]=[];
    const api={registerMacro:(d:{name:string;handler:(ctx:any)=>Promise<string>})=>handlers.set(d.name,d.handler),log:{warn:(s:string)=>warnings.push(s)}};
    registerPhoneMacros(api as never,async(chat,user)=>{calls.push(`${user}/${chat}`);return emptyDocument(chat);});
    const format=handlers.get("phone_format")!;
    const host={commit:false,env:{chat:{id:"a"},extra:{userId:"u"}}};
    expect(await format(host)).toContain("End each reply with <phone-state>");expect(calls).toEqual(["u/a"]);
    expect(await format({...host,commit:true,chatId:"a"})).toContain("End each reply with <phone-state>");
    const before=calls.length;
    expect(await format({...host,userId:"v"})).toBe("");expect(warnings.at(-1)).toBe("Lumi Phone Tracker: phone_format empty: extension setting.");
    expect(await format({...host,chatId:"b"})).toBe("");
    expect(await format({commit:false,args:{userId:"u",chatId:"a"},env:{variables:{chat:{userId:"u"}}}})).toBe("");
    expect(warnings.at(-1)).toBe("Lumi Phone Tracker: phone_format empty: no userId.");
    expect(calls.length).toBe(before);
    expect(warnings.every(s=>!s.includes("u/a")&&!s.includes("v"))).toBe(true);
  });
  function fixture() {
    const saved = new Map<string, string>(); const histories = new Map<string, StoryRow[]>();
    let writes = 0;
    const io: PhoneIO = { authorize: async (chat, user) => user === `owner-${chat}`,
      read: async chat => saved.get(chat) ?? "", write: async (chat, value) => { writes++; saved.set(chat, value); },
      history: async chat => structuredClone(histories.get(chat) ?? []), player: async () => "Player" };
    return { saved, histories, io, store: new PhoneStore(io), writes: () => writes };
  }
  test("preview never writes; chats/restart are isolated and stale revisions reject", async () => {
    const f = fixture(); f.histories.set("a", [row(0, { time: "A" })]); f.histories.set("b", [{ ...row(0, { time: "B" }), chat_id: "b" }]);
    expect(renderMacro("phone_scene", await f.store.preview("a", "owner-a"))).toBe("time: A"); expect(f.writes()).toBe(0);
    const a = await f.store.sync("owner-a", "a"); await f.store.sync("owner-b", "b");
    expect(renderMacro("phone_scene", await new PhoneStore(f.io).preview("b", "owner-b"))).toBe("time: B");
    await expect(f.store.sync("owner-b", "a")).rejects.toThrow();
    await expect(f.store.update("owner-a", "a", a.revision - 1, { settings: defaults() })).rejects.toThrow();
    const changed = await f.store.update("owner-a", "a", a.revision, { edit: { target: "scene", field: "time", value: "User time" } });
    expect(changed.state.scene.time?.by).toBe("user");
    expect((await new PhoneStore(f.io).preview("a", "owner-a")).state.scene.time?.value).toBe("User time");
  });
  test("invalid settings and corrupt stored data retain the original snapshot", async () => {
    const f = fixture(); const a = await f.store.sync("owner-a", "a"); const before = f.saved.get("a");
    for (const settings of [{ notesPerSection: 2 }, { notesPerSection: 31 }, { keepTexts: 0 }, { keepTrackers: -1 }, { keepTexts: 2.5 }]) {
      await expect(f.store.update("owner-a", "a", a.revision, { settings })).rejects.toThrow(); expect(f.saved.get("a")).toBe(before);
    }
    expect(() => readDocument('{"schema":99}', "a")).toThrow();
  });
  test("store sends skip warnings to the log only, not phone notices", async () => {
    const f = fixture(); const logs: string[] = []; f.io.warn = text => logs.push(text);
    f.histories.set("a", [row(0, {}, "", { content: '<phone-state>\ntime="Night"\nweather=private-secret\n</phone-state>' })]);
    const doc = await f.store.sync("owner-a", "a");
    await f.store.preview("a", "owner-a"); await f.store.sync("owner-a", "a");
    expect(logs.length).toBe(1); expect(logs[0]).toContain("invalid JSON");
    expect(doc.state.notices).toEqual([]); expect(doc.state.scene.time?.value).toBe("Night");
  });
  test("changing one setting preserves other switches and retention values", async () => {
    const f = fixture(); let doc = await f.store.sync("owner-a", "a");
    doc = await f.store.update("owner-a", "a", doc.revision, { settings: { enabled: { weather: false }, keepTexts: 7 } });
    doc = await f.store.update("owner-a", "a", doc.revision, { settings: { enabled: { "scene.time": false } } });
    expect(doc.settings.enabled.weather).toBe(false); expect(doc.settings.keepTexts).toBe(7); expect(doc.settings.enabled["scene.time"]).toBe(false);
  });
  test("idempotent sync, full notices persist until dismissed, and rejected old notes do not refill a gap", async () => {
    const f = fixture(); f.histories.set("a", [row(0, { people: Array.from({ length: 11 }, (_, i) => ({ name: `P${i}` })) })]);
    let doc = await f.store.sync("owner-a", "a"); const revision = doc.revision;
    doc = await f.store.sync("owner-a", "a"); expect(doc.revision).toBe(revision);
    expect(doc.state.notices.length).toBe(1); expect(doc.state.notes.people.length).toBe(10);
    doc = await f.store.update("owner-a", "a", doc.revision, { edit: { target: "note", section: "people", name: "P0", remove: true } });
    expect(doc.state.notes.people.length).toBe(9); expect(doc.state.notes.people.some(n => n.name === "P10")).toBe(false);
    doc = await f.store.update("owner-a", "a", doc.revision, { dismissNotice: doc.state.notices[0] });
    expect((await new PhoneStore(f.io).preview("a", "owner-a")).state.notices).toEqual([]);
  });
  test("turning inference off preserves previously admitted inferred values", async () => {
    const f = fixture(); f.histories.set("a", [row(0, { present: ["Ada"], contacts: [{ name: "Ada", physical: { value: "scarred hand", inferred: true } }] })]);
    let doc = await f.store.sync("owner-a", "a");
    doc = await f.store.update("owner-a", "a", doc.revision, { settings: { inferMissing: true } });
    expect(doc.state.contacts.find(c => c.name === "Ada")?.fields.physical?.inferred).toBe(true);
    doc = await f.store.update("owner-a", "a", doc.revision, { settings: { inferMissing: false } });
    expect(doc.state.contacts.find(c => c.name === "Ada")?.fields.physical?.value).toBe("scarred hand");
  });
  test("legacy notes/details are preserved without guessing their log categories", async () => {
    const f = fixture(); f.histories.set("a", [row(0, {}, "", { content: '<phone-state>\nlocation="Home"\nnotes=["Bring the map"]\ndetails="Door locked"\n</phone-state>' })]);
    const doc = await f.store.sync("owner-a", "a");
    expect(doc.state.notes.misc.map(n => n.detail)).toEqual(["Bring the map", "Door locked"]);
    expect(doc.state.notes.misc.every(n => !n.sendToAI && !n.addedByUser)).toBe(true);
    expect(renderMacro("phone_notes", doc)).toBe("");
  });
  test("schema-1 migration preserves original data and last-good malformed fallback", async () => {
    const f = fixture();
    const oldRow = row(0, {}, "", { content: '<phone-state>\nlocation="Home"\nnotes=["Bring the map"]\n</phone-state>' });
    const old = rebuild("a", [oldRow]); const saved = JSON.stringify(old);
    f.io.legacy = async () => structuredClone(old);
    f.histories.set("a", [{ ...oldRow, content: "<phone-state>broken</phone-state>" }]);
    const doc = await f.store.sync("owner-a", "a");
    expect(doc.legacy).toEqual(old); expect(JSON.stringify(old)).toBe(saved);
    expect((doc.state.scene.location?.value as { name: string }).name).toBe("Home");
    expect(doc.state.notes.misc[0].detail).toBe("Bring the map");
    expect((await new PhoneStore(f.io).preview("a", "owner-a")).state.notes.misc[0].detail).toBe("Bring the map");
  });
  test("an unrelated quote cannot replace a user-edited field", () => {
    const doc = emptyDocument("a"); doc.edits.push(edit("scene", { field: "location", value: "Home" }));
    const result = run([row(0), row(1, { location: { value: "Moon", evidence: "Ada is speaking." } }, "Ada is speaking.")], doc);
    expect((result.state.scene.location?.value as { name: string }).name).toBe("Home");
  });
  test("new history after a UI snapshot rejects a stale user edit", async () => {
    const f = fixture(); f.histories.set("a", [row(0, { time: "Night" })]); const doc = await f.store.sync("owner-a", "a");
    f.histories.set("a", [row(0, { time: "Night" }), row(1, { time: "Dawn" })]);
    await expect(f.store.update("owner-a", "a", doc.revision, { edit: { target: "scene", field: "time", value: "Noon" } })).rejects.toThrow();
  });
  test("adjacent multipart tags, media, and source-index attribution survive trimming", () => {
    const tag = '<phone-text from="Ada">Hi</phone-text>';
    const doc = run([row(0, {}, "", { content: tag })]);
    const image = { type: "image" as const, data: "abc", mime_type: "image/png" };
    const out = trimPhoneHistory([{ role: "assistant", __isChatHistory: true, sourceIndexInChat: 0,
      content: [{ type: "text", text: tag.slice(0, 8) }, { type: "text", text: tag.slice(8) }, image] }], doc.settings, doc);
    expect(out[0].content).toEqual([{ type: "text", text: tag }, image]);
  });
});

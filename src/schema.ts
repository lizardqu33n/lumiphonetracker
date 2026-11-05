import { validateActivity, validateEmail } from "./activity";
import { parseShorthand, usablePatch } from "./shorthand";
import { isRecord } from "./shared";
import { CONTACT_KEYS, SCENE_KEYS, SECTIONS, emptyPatch, type Change, type Patch, type NotePatch, type Value } from "./model";
import { decodeEntities, parseAttributes, scanTags, transformTags } from "./tags";
import type { TextData } from "./model";

export const short = (v: unknown, max = 500): v is string => typeof v === "string" && v.length <= max &&
  !["\u0000", "\n", "\r", "<"].some(c => v.includes(c));
const named = (v: unknown): v is string => short(v, 100) && !!v.trim();
function keys(v: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(v).some(k => !allowed.includes(k))) throw new Error("Unknown field");
}
const list = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => named(x));
export function change(key: string, raw: unknown): Change | undefined {
  if (raw === null) return;
  let value: unknown = raw; let evidence: string | undefined; let inferred = false;
  if (isRecord(raw) && Object.hasOwn(raw, "value")) {
    keys(raw, ["value", "evidence", "inferred"]); value = raw.value;
    if (raw.evidence !== undefined && (!short(raw.evidence, 800) || raw.evidence.trim().length < 3)) throw new Error("Invalid evidence");
    if (raw.inferred !== undefined && typeof raw.inferred !== "boolean") throw new Error("Invalid inference marker");
    evidence = raw.evidence as string | undefined; inferred = raw.inferred === true;
    if (value === null) return;
  }
  if (key === "location") {
    if (short(value, 240)) value = { name: value, wider: [] };
    if (!isRecord(value)) throw new Error("Invalid place");
    keys(value, ["name", "wider"]);
    if (!named(value.name) || (value.wider !== undefined && !list(value.wider))) throw new Error("Invalid place");
    value = { name: value.name.trim(), wider: value.wider ?? [] };
  } else if (["present", "roles"].includes(key)) {
    if (!list(value)) throw new Error("Invalid list");
    value = [...new Set(value.map(x => x.trim()))];
  } else if (key === "attire") {
    if (!isRecord(value)) throw new Error("Invalid attire");
    keys(value, ["worn", "removed"]);
    if (!list(value.worn) || !list(value.removed)) throw new Error("Attire needs complete worn/removed lists");
  } else if (!short(value)) throw new Error("Invalid value");
  return { value: value as Value, ...(evidence ? { evidence } : {}), ...(inferred ? { inferred } : {}) };
}
export function validateNote(raw: unknown, user = false): NotePatch {
  if (!isRecord(raw)) throw new Error("Invalid note");
  keys(raw, ["name", "detail", "context", "resolved", "evidence", ...(user ? ["sendToAI"] : [])]);
  if (!named(raw.name)) throw new Error("Invalid name");
  for (const k of ["detail", "context"]) if (raw[k] !== undefined && !short(raw[k], 240)) throw new Error("Invalid note text");
  if (raw.resolved !== undefined && typeof raw.resolved !== "boolean") throw new Error("Invalid resolution");
  if (raw.evidence !== undefined && !short(raw.evidence, 800)) throw new Error("Invalid evidence");
  if (raw.sendToAI !== undefined && typeof raw.sendToAI !== "boolean") throw new Error("Invalid flag");
  return raw as unknown as NotePatch;
}
/** JSON used by the main block and later Helper AI follows exactly the same schema. */
export function validateExpanded(input: unknown): Patch {
  if (!isRecord(input)) throw new Error("Invalid tracker");
  keys(input, [...SCENE_KEYS, "weather","calls","bank","transactions", "contacts", "locations", ...SECTIONS.filter(k => k !== "misc")]);
  const patch = emptyPatch();
  for(const key of ["calls","bank","transactions"] as const)if(input[key]!==undefined&&input[key]!==null){if(!Array.isArray(input[key]))throw Error("Invalid entries");(patch as unknown as Record<string,unknown>)[key]=(input[key] as unknown[]).map(v=>validateActivity(key,v));}
  for (const key of SCENE_KEYS) if (input[key] !== undefined) patch.scene[key] = change(key, input[key]);
  if (input.weather !== undefined) patch.weather = change("weather", input.weather);
  for (const [key, allowed] of [["contacts", ["name", ...CONTACT_KEYS]], ["locations", ["name", "description", "relation", "evidence"]]] as const) {
    const entries = input[key]; if (entries === undefined || entries === null) continue;
    if (!Array.isArray(entries)) throw new Error("Invalid entries");
    for (const entry of entries) {
      if (!isRecord(entry)) throw new Error("Invalid entry"); keys(entry, allowed);
      if (!named(entry.name)) throw new Error("Invalid name");
      if (key === "contacts") {
        const fields: Patch["contacts"][number]["fields"] = {};
        for (const field of CONTACT_KEYS) if (entry[field] !== undefined) {
          const c = change(field, entry[field]);
          const concrete = (v: Value): boolean => {
            const words = typeof v === "string" ? v.toLocaleLowerCase().split(" ") : [];
            const strings = typeof v === "string" ? [v] : Array.isArray(v) ? v : "worn" in v ? [...v.worn, ...v.removed] : [v.name];
            const digit = (c: string) => c >= "0" && c <= "9";
            return !words.some(w => ["or", "maybe", "perhaps", "possibly", "probably"].includes(w)) &&
              !strings.some(s => [...s].some((c, i) => ["-", "–"].includes(c) && digit(s[i - 1]) && digit(s[i + 1])));
          };
          if (c && !concrete(c.value)) throw new Error("Contact fields need one concrete value");
          fields[field] = c;
        }
        patch.contacts.push({ name: entry.name.trim(), fields });
      } else {
        for (const field of ["description", "relation", "evidence"]) if (entry[field] !== undefined && !short(entry[field])) throw new Error("Invalid place description");
        patch.locations.push(entry as unknown as Patch["locations"][number]);
      }
    }
  }
  for (const section of SECTIONS.filter(s => s !== "misc")) {
    const entries = input[section]; if (entries === undefined || entries === null) continue;
    if (!Array.isArray(entries)) throw new Error("Invalid note list");
    patch.notes[section] = entries.map(n => validateNote(n));
    if (section !== "plots" && patch.notes[section]!.some(n => n.resolved !== undefined)) throw new Error("Only plots resolve");
  }
  return patch;
}
export interface ParseIssue { line: number | null; field: string; reason: string }
export function parseExpanded(body: string): Patch | null {
  return parseLines(body).patch;
}
/** Independent top-level lines; nested objects/arrays remain atomic. */
function parseLines(body: string): { patch: Patch | null; invalidFields: string[]; issues: ParseIssue[] } {
  if (body.length > 64000) return { patch: null, invalidFields: [], issues: [{ line: null, field: "block", reason: "block too large" }] };
  if (/^\s*(?:loc|time|date|weather|present|c|p|people|items|rules|plots|done|call|bank|tx):/m.test(body)) return parseShorthand(decodeEntities(body), validateExpanded);
  const groups = new Map<string, { value: string; line: number }[]>();
  const allowed = [...SCENE_KEYS, "weather","calls","bank","transactions", "contacts", "locations", ...SECTIONS.filter(k => k !== "misc")];
  const invalidFields = new Set<string>();
  const issues: ParseIssue[] = [];
  const lines = body.split("\n").map((s, i) => ({ text: s.trim(), number: i + 1 })).filter(s => s.text);
  const safeField = (key: string) => [...allowed, "misc"].includes(key) ? key : "(unknown)";
  for (const row of lines) {
    const line = row.text;
    const i = line.indexOf("=");
    const name = i < 1 ? line.split(" ")[0].split("\t")[0] : line.slice(0, i).trim();
    if (i < 1) { invalidFields.add(name); issues.push({ line: row.number, field: safeField(name), reason: "missing field=value separator" }); continue; }
    groups.set(name, [...groups.get(name) ?? [], { value: line.slice(i + 1), line: row.number }]);
  }
  const accepted: Record<string, unknown> = Object.create(null);
  let valid = 0;
  for (const [key, values] of groups) {
    if (!allowed.includes(key) || values.length !== 1 || invalidFields.has(key)) {
      invalidFields.add(key);
      for (const v of values) issues.push({ line: v.line, field: safeField(key), reason: allowed.includes(key) ? "duplicate or conflicting field" : "unknown or forbidden field" });
      continue;
    }
    let value: unknown;
    try {
      value = JSON.parse(decodeEntities(values[0].value));
    } catch {
      invalidFields.add(key); issues.push({ line: values[0].line, field: safeField(key), reason: "invalid JSON" }); continue;
    }
    try {
      if (!usablePatch(validateExpanded({ [key]: value }))) throw new Error("Placeholder update");
      accepted[key] = value; valid++;
    } catch { invalidFields.add(key); issues.push({ line: values[0].line, field: safeField(key), reason: "invalid value or structure" }); }
  }
  return { patch: valid || !lines.length ? validateExpanded(accepted) : null, invalidFields: [...invalidFields], issues };
}
export function parseExpandedReply(content: string): { patch: Patch | null; invalidFields: string[]; issues: ParseIssue[]; texts: TextData[]; badTexts: boolean; emails:import("./model").EmailData[];badEmails:boolean; prose: string } {
  const tags = scanTags(content); const states = tags.filter(t => t.name === "phone-state");
  let patch: Patch | null = emptyPatch();
  let invalidFields: string[] = [];
  let issues: ParseIssue[] = [];
  if (states.length) {
    if (states.length === 1 && states[0].complete && !states[0].header.trim()) ({ patch, invalidFields, issues } = parseLines(states[0].body));
    else { patch = null; issues.push({ line: null, field: "block", reason: "incomplete, multiple or malformed tracker block" }); }
  }
  if (tags.some(t => !t.name && content.slice(t.start).toLowerCase().startsWith("<phone-st"))) {
    patch = null; issues.push({ line: null, field: "block", reason: "unfinished tracker tag" });
  }
  const texts: TextData[] = []; let badTexts = false;
  for (const tag of tags.filter(t => t.name === "phone-text")) {
    const attrs = parseAttributes(tag.header); const text = decodeEntities(tag.body).trim();
    if (!tag.complete || !attrs || !named(attrs.from) || !text || text.length > 3000 || tag.body.includes("<") || text.includes("\u0000") ||
      Object.keys(attrs).some(k => !["from", "time", "to", "group"].includes(k)) ||
      (attrs.group !== undefined && !named(attrs.group)) || (attrs.time !== undefined && !short(attrs.time, 100)) || (attrs.to !== undefined && !named(attrs.to)) || texts.length >= 12) { badTexts = true; continue; }
    texts.push({ from: attrs.from.trim(), text, ...(attrs.time ? { time: attrs.time } : {}), ...(attrs.to ? { to: attrs.to.trim() } : {}),...(attrs.group?{group:attrs.group.trim()}:{}) });
  }
  const emails:import("./model").EmailData[]=[];let badEmails=false;
  for(const tag of tags.filter(t=>t.name==="phone-email")){try{const attrs=parseAttributes(tag.header);if(!tag.complete||!attrs||tag.body.includes("<")||emails.length>=12)throw Error("Invalid email");emails.push(validateEmail({...attrs,body:decodeEntities(tag.body)}));}catch{badEmails=true;}}
  return { patch, invalidFields, issues, texts, badTexts, emails,badEmails,prose: transformTags(content, "strip") };
}

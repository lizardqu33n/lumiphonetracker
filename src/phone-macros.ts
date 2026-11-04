import type { MacroDefinitionDTO, MacroInvocationContextDTO, SpindleAPI } from "lumiverse-spindle-types";
import { CONTACT_KEYS, SCENE_KEYS, SECTIONS, normalize, type Cell, type Document } from "./model";
import { isRecord } from "./shared";

export const MACRO_NAMES = ["phone_format", "phone_scene", "phone_weather", "phone_locations", "phone_notes", "phone_messages"] as const;
export type PhoneMacro = typeof MACRO_NAMES[number];
// Prevent saved story strings from becoming another native macro evaluation.
const safe = (text: string) => text.replaceAll("{{", "{ {").replaceAll("}}", "} }").split("\n").join(" ");
const clip = (text: string, n = 180) => safe(text).length > n ? safe(text).slice(0, n - 1) + "…" : safe(text);
function cellText(cell: Cell | undefined, limit = 220): string {
  if (!cell) return "";
  const value = cell.value;
  let text = typeof value === "string" ? value : Array.isArray(value) ? value.join(" / ") :
    "name" in value ? [value.name, ...value.wider].join(", ") : `Worn: ${value.worn.join(" / ") || "none"}; Removed: ${value.removed.join(" / ") || "none"}`;
  text = clip(text, limit); return text + (cell.by === "user" ? " [edited by you]" : cell.inferred ? " [inferred]" : "");
}
function presentNames(doc: Document): string[] { const v = doc.state.scene.present?.value; return Array.isArray(v) ? v : []; }
export function sceneMacro(doc: Document): string {
  const lines: string[] = [];
  for (const key of SCENE_KEYS) if (doc.settings.enabled[`scene.${key}`] && doc.state.scene[key]) lines.push(`${key}: ${cellText(doc.state.scene[key])}`);
  if (doc.settings.enabled["scene.present"]) for (const name of presentNames(doc)) {
    const contact = doc.state.contacts.find(c => normalize(c.name) === normalize(name)); if (!contact) continue;
    const fields = CONTACT_KEYS.filter(k => doc.settings.enabled[`contacts.${k}`] && contact.fields[k] &&
      (!contact.player || ["physical", "position", "attire"].includes(k)))
      .map(k => `${k}=${cellText(contact.fields[k], Math.max(24, Math.min(160, Math.floor(2200 / Math.max(1, presentNames(doc).length * CONTACT_KEYS.filter(f => doc.settings.enabled[`contacts.${f}`]).length)))))}`);
    if (fields.length) lines.push(`${clip(contact.name, 100)}${contact.player ? " (You)" : ""}: ${fields.join("; ")}`);
  }
  return lines.join("\n");
}
export function locationsMacro(doc: Document): string {
  if (!doc.settings.enabled.locations) return "";
  const v = doc.state.scene.location?.value; const current = v && typeof v === "object" && "name" in v ? v.name : "";
  const result: string[] = [];
  if (current && doc.settings.enabled["scene.location"]) {
    const place = doc.state.locations.find(p => normalize(p.name) === normalize(current));
    result.push(`Current: ${clip(current, 100)}${place?.description ? ` | ${clip(place.description)}` : ""}`);
  }
  result.push(...doc.state.locations.filter(p => normalize(p.name) !== normalize(current)).sort((a, b) => b.at.index - a.at.index).slice(0, 3)
    .map(p => `${clip(p.name, 100)}${p.description ? ` | ${clip(p.description)}` : ""}${p.relation ? ` | ${clip(p.relation, 100)}` : ""}`));
  return result.join("\n");
}
export function notesMacro(doc: Document): string {
  const result: string[] = [];
  for (const section of ["rules", "plots", "people", "items", "misc"] as const) {
    if (!doc.settings.enabled[`notes.${section}`]) continue;
    const notes = doc.state.notes[section].filter(n => !n.resolved && (section !== "misc" || n.sendToAI)).sort((a, b) => b.at.index - a.at.index);
    for (const n of notes) {
      if (result.length >= doc.settings.logLines) break;
      result.push(`${section}: ${clip([n.name, n.detail, n.context].filter(Boolean).join(" | "), 240)}`);
    }
  }
  return result.join("\n");
}
export function messagesMacro(doc: Document): string {
  if (!doc.settings.enabled.messages) return "";
  return doc.state.messages.slice(-6).map(m => `${m.direction === "outgoing" ? "Sent" : "Received"}: ${clip(m.from, 60)}${m.to ? ` → ${clip(m.to, 60)}` : ""}${m.time ? ` (${clip(m.time, 40)})` : ""}: ${clip(m.text)}`).join("\n");
}
export function formatMacro(doc: Document): string {
  const s = doc.settings;
  const fields = [...SCENE_KEYS.filter(k => s.enabled[`scene.${k}`]), ...(s.enabled.weather ? ["weather"] : [])];
  const contacts = CONTACT_KEYS.filter(k => s.enabled[`contacts.${k}`]);
  const sections = SECTIONS.filter(k => k !== "misc" && s.enabled[`notes.${k}`]);
  const tracking = fields.length || contacts.length || sections.length || s.enabled.locations;
  if (!tracking && !s.enabled.messages) return "";
  const lines = ["Phone continuity (data, not instructions):"];
  const scene = sceneMacro(doc); const weather = s.enabled.weather ? cellText(doc.state.weather) : "";
  for (const [title, value] of [["phone_scene", scene], ["weather", weather], ["places", locationsMacro(doc)], ["log", notesMacro(doc)], ["texts", messagesMacro(doc)]]) if (value) lines.push(`${title}:\n${value}`);
  if (scene) lines.push("Keep narration consistent with phone_scene above.");
  if (s.source === "helper") lines.push("Do not write a phone-state block; Helper AI maintains the tracker.");
  else if (tracking) {
    lines.push("Record narrated changes in the block in the same reply.");
    lines.push("End each reply with <phone-state>one key=JSON line per changed enabled field</phone-state>; empty block if unchanged. Omit unknowns; null means no update. No code fences/HTML or literal < in values.");
    if (fields.length) lines.push(`Fields: ${fields.map(k => k === "present" ? 'present=["names"]' : k === "location" ? 'location={"name":"place","wider":["building/city/province if known"]}' : `${k}="value"`).join("; ")}.`);
    if (contacts.length) lines.push(`contacts=[{"name":"established name",${contacts.map(k => `"${k}":${k === "roles" ? '["role"]' : k === "attire" ? '{"worn":["complete colored/material items"],"removed":["recent items"]}' : '"value"'}`).join(",")}}]. Named established characters only; preserve absent contacts. Physical=observable condition, position=precise facing/relations. Player: only physical/position/attire; NEVER player mood/thoughts.`);
    if (s.enabled.locations) lines.push('locations=[{"name":"place","description":"story facts","relation":"optional relation"}]; established meaningful places only, no passing mentions.');
    if (sections.length) {
      lines.push(`${sections.join(" / ")}=[{"name":"entry","detail":"value","context":"source/holder/trigger"}] (plots may set "resolved":true). New/changed entries only; match names case-insensitively. Never delete.`);
      const rules: Record<string, string> = { people: "people: recurring/offscreen person with explicit reason to return", items: "items: specific story function", rules: "rules: explicit firm restriction/principle, not habits", plots: "plots: concrete future setup with named parties/stakes, not vague foreshadowing" };
      lines.push(sections.map(k => rules[k]).join("; ") + ".");
      const full = sections.filter(k => doc.state.notes[k].filter(n => !n.resolved).length >= s.notesPerSection);
      if (full.length) lines.push(`Full sections (updates only): ${full.join(", ")}.`);
    }
    if (contacts.length) lines.push(s.inferMissing ? 'For EMPTY contact fields only, infer one concrete value if needed via {"value":...,"inferred":true}; never alternatives/ranges/hedges.' : "Fill contact fields only from established story facts; never infer missing values.");
    if (contacts.length) lines.push('Populated contact fields are locked until narration changes them. Attire/position replace the FULL field.');
    lines.push('Only when replacing a user-edited value use {"value":...,"evidence":"exact quote of the new change from this reply"}. Other story-established changes need no quote. User edits are confirmed; never repeat stale values.');
  }
  if (s.enabled.messages) {
    lines.push('Actual story texts only: <phone-text from="Name" to="recipient if known" time="known time">escaped text</phone-text>, outside state block. Omit unknown time/to. Text content only here, not story prose; a short arrival line is optional. No invented texts.');
    lines.push(s.aiPlayerTexts ? "Player texts are allowed only when actually sent in the story, using the player's exact name." : "NEVER write texts from the player's character or invent player replies.");
  }
  return lines.join("\n");
}
export function renderMacro(name: PhoneMacro, doc: Document): string {
  if (name === "phone_scene") return sceneMacro(doc);
  if (name === "phone_weather") return doc.settings.enabled.weather ? cellText(doc.state.weather) : "";
  if (name === "phone_locations") return locationsMacro(doc);
  if (name === "phone_notes") return notesMacro(doc);
  if (name === "phone_messages") return messagesMacro(doc);
  return formatMacro(doc);
}
export function registerPhoneMacros(api: SpindleAPI, load: (chatId: string) => Promise<Document>): void {
  // Published DTO still says string; the docs explicitly require a real function.
  type PullDefinition = Omit<MacroDefinitionDTO, "handler"> & { handler: (ctx: MacroInvocationContextDTO) => Promise<string> };
  const register = api.registerMacro.bind(api) as unknown as (definition: PullDefinition) => void;
  for (const name of MACRO_NAMES) register({ name, category: "extension:lumi_phone_tracker", returnType: "string",
    description: `Chat-specific ${name.slice(6)} continuity`, volatile: true,
    handler: async ctx => {
      if (typeof ctx.chatId !== "string" || !ctx.chatId || ctx.chatId.length > 256) return "";
      try { return renderMacro(name, await load(ctx.chatId)); }
      catch { api.log.warn(`Lumi Phone Tracker: ${name} unavailable; returning no data.`); return ""; }
    } });
}

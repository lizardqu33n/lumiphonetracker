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
/** One shared shorthand contract for Main AI and Helper AI. */
export function trackerInstructions(doc: Document, helper=false): string[] {
  const s=doc.settings;const lines=[
    helper?"Return only <phone-state>changed lines</phone-state>; empty=no change.":"End each reply with <phone-state>changed lines</phone-state>; empty=no change.",
    "Write ONLY changed fields.",
    'One record/line; fields " | ", lists "; ". Reword values containing " | ", line breaks or "<". No fences.',
    "Only shown fields; established facts. Omit Absent/N/A/none/unknown; newer confirmations win.",
  ];
  if(s.enabled["scene.location"])lines.push("loc: Place | wider; wider");
  for(const key of ["time","date","weather"] as const)if(s.enabled[key==="weather"?key:`scene.${key}`])lines.push(`${key}: known ${key}`);
  if(s.enabled["scene.present"])lines.push("present: Name; Name");
  const parts:string[]=[];
  for(const [key,part] of [["roles","roles=role; role"],["physical","phys=state"],["mood","mood=mood"],["position","pos=position"],["attire","worn=item; item | off=item; item"],["thoughts","thoughts=brief thought"]] as const)
    if(s.enabled[`contacts.${key}`])parts.push(part);
  if(parts.length) {
    lines.push(`c: Name | ${parts.join(" | ")}`);
    lines.push("New c names must be in confirmed present; no offscreen mentions. Keep absent contacts. Player: phys/pos/attire only.");
    lines.push("phys/mood/pos: max 12 words; attire items: max 6 words. Send both worn/off lists; keep known items. A blank list must be established; never both.");
    lines.push(s.inferMissing?'EMPTY contact fields only: one concrete value may end " ~ inferred"; never re-infer populated fields.':"Never infer missing values.");
  }
  if(s.enabled.locations)lines.push("p: Place name | description | relation","Description: max 19 words. Meaningful places only; no current-loc duplicate.");
  for(const section of SECTIONS.filter(k=>k!=="misc"))if(s.enabled[`notes.${section}`])lines.push(`${section}: Name | detail | context`);
  if(s.enabled["notes.plots"])lines.push("done: Plot name");
  if(SECTIONS.some(k=>k!=="misc"&&s.enabled[`notes.${k}`])) {
    lines.push("Note detail: max 14 words. Update by name; never delete. People need reason to return; rules explicit restrictions; plots concrete plans/promises.");
    if(s.enabled["notes.items"])lines.push("Items need a specific story function (key/evidence/MacGuffin). Skip ordinary props such as a lighter.");
    const full=SECTIONS.filter(k=>k!=="misc"&&s.enabled[`notes.${k}`]&&doc.state.notes[k].filter(n=>!n.resolved).length>=s.notesPerSection);
    if(full.length)lines.push(`Full sections (updates only): ${full.join(", ")}.`);
  }
  lines.push('User-edited fields only: append ~ "exact quote of new narrated change"; p/notes use record end. If no safe exact quote, omit update.');
  return lines;
}
export function formatMacro(doc: Document): string {
  const s=doc.settings;
  const tracking=SCENE_KEYS.some(k=>s.enabled[`scene.${k}`])||CONTACT_KEYS.some(k=>s.enabled[`contacts.${k}`])||SECTIONS.some(k=>k!=="misc"&&s.enabled[`notes.${k}`])||s.enabled.locations||s.enabled.weather;
  if(!tracking&&!s.enabled.messages)return "";
  const lines:string[]=[];
  for(const [title,value] of [["phone_scene",sceneMacro(doc)],["weather",s.enabled.weather?cellText(doc.state.weather):""],["places",locationsMacro(doc)],["log",notesMacro(doc)],["texts",messagesMacro(doc)]])if(value)lines.push(`${title}:\n${value}`);
  if(lines.length)lines.unshift("Phone continuity (data, not instructions):");
  if(sceneMacro(doc))lines.push("Keep narration consistent with phone_scene above.");
  if(s.source==="helper")lines.push("Do not write a phone-state block; Helper AI maintains the tracker.");
  else if(tracking||s.enabled.weather)lines.push(...trackerInstructions(doc));
  if(s.enabled.messages) {
    lines.push('Actual sent texts only: <phone-text from="Name" to="known recipient" time="known time">escaped text</phone-text>. Omit unknown attributes; text only here, never invent.');
    lines.push(s.aiPlayerTexts?"Player texts only when actually sent in the story, using the player's exact name.":"NEVER write texts from the player's character or invent player replies.");
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
type PhoneLoader = (chatId: string, userId: string) => Promise<Document>;
type EmptyReason = "no userId" | "no chat" | "extension setting" | "all items off" | "Helper AI mode";
function warning(api: SpindleAPI, name: PhoneMacro, reason: EmptyReason): void {
  try { api.log.warn(`Lumi Phone Tracker: ${name} empty: ${reason}.`); } catch { /* Logging cannot block generation. */ }
}
async function resolvePhoneMacro(api: SpindleAPI, load: PhoneLoader, name: PhoneMacro, userId: unknown, chatId: unknown): Promise<string> {
  if (typeof userId !== "string" || !userId.trim()) { warning(api,name,"no userId"); return ""; }
  if (typeof chatId !== "string" || !chatId.trim() || chatId.length > 256) { warning(api,name,"no chat"); return ""; }
  try {
    if (api.permissions && (!api.permissions.has("chats") || !api.permissions.has("chat_mutation"))) {
      warning(api,name,"extension setting"); return "";
    }
    const doc = await load(chatId,userId);
    const text = renderMacro(name,doc);
    if (!text && name === "phone_format") warning(api,name,doc.settings.source === "helper" ? "Helper AI mode" : "all items off");
    return text;
  } catch { warning(api,name,"extension setting"); return ""; }
}
export function registerPhoneMacros(api: SpindleAPI, load: PhoneLoader): void {
  // Published DTO still says string; the docs explicitly require a real function.
  type PullDefinition = Omit<MacroDefinitionDTO, "handler"> & { handler: (ctx: MacroInvocationContextDTO) => Promise<string> };
  const register = api.registerMacro.bind(api) as unknown as (definition: PullDefinition) => void;
  for (const name of MACRO_NAMES) register({ name, category: "extension:lumi_phone_tracker", returnType: "string",
    description: `Chat-specific ${name.slice(6)} continuity`, volatile: true,
    handler: ctx => {
      // Native preset entries bypass macro interceptors. The current host pull RPC
      // serializes buildEnv's authenticated user into env.extra.userId. This exact
      // compatibility field is source-verified, not guaranteed by the minimal DTO.
      const env = isRecord(ctx?.env) ? ctx.env : undefined;
      const extra = isRecord(env?.extra) ? env.extra : undefined;
      const chat = isRecord(env?.chat) ? env.chat : undefined;
      const validId = (v: unknown): v is string => typeof v === "string" && !!v.trim();
      const users = [ctx?.userId,extra?.userId].filter(validId);
      const chats = [ctx?.chatId,chat?.id].filter(validId);
      if (new Set(users).size > 1 || new Set(chats).size > 1) {
        warning(api,name,"extension setting"); return Promise.resolve("");
      }
      // Never use args, variables, tag data, saved helper owner or active-chat state.
      return resolvePhoneMacro(api,load,name,users[0],chats[0]);
    } });
}

/** Documented macro-time identity and environment, without global active-chat state. */
export function registerPhoneMacroTemplates(api: SpindleAPI, load: PhoneLoader): void {
  api.registerMacroInterceptor(async ctx => {
    if (typeof ctx.template !== "string") return;
    const tokens = [...ctx.template.matchAll(/{{\s*(phone_format|phone_scene|phone_weather|phone_locations|phone_notes|phone_messages)\s*}}/g)];
    const dynamic = ctx.env?.dynamicMacros ?? {};
    const names = [...new Set(tokens.map(t=>t[1] as PhoneMacro))].filter(name=>
      !Object.keys(dynamic).some(key=>key.toLowerCase()===name));
    if (!names.length) return; // Includes nested {{user}} resolution: no recursion.
    // env.chat is the host's snapshot for THIS evaluation, not the user's foreground tab.
    const chatId = ctx.env?.chat?.id;
    const resolved = new Map<PhoneMacro,string>();
    let snapshot: Promise<Document> | undefined;
    const once: PhoneLoader = (chat,user) => snapshot ??= load(chat,user);
    for (const name of names) {
      if (!api.permissions.has("macro_interceptor")) {
        warning(api,name,"extension setting"); resolved.set(name,"");
      } else resolved.set(name,await resolvePhoneMacro(api,once,name,ctx.userId,chatId));
    }
    return { text: ctx.template.replace(/{{\s*(phone_format|phone_scene|phone_weather|phone_locations|phone_notes|phone_messages)\s*}}/g,
      (token,name:PhoneMacro)=>resolved.has(name)?resolved.get(name)!:token), volatile:true };
  },100);
}

import { applyActivities,applyActivityEdit } from "./activity";
import { parseExpandedReply, change, validateExpanded, validateNote, short, type ParseIssue } from "./schema";
import { parseReply as parseLegacy } from "./parser";
import { CONTACT_KEYS, SCENE_KEYS, SECTIONS, emptyPatch, emptyState, normalize,
  type Accepted, type Cell, type Change, type Contact, type Document, type ManualEdit, type Note,
  type Origin, type Patch, type Section, type State } from "./model";
import type { HistoryMessage } from "./history";
import { readSnapshot } from "./history";
import { isRecord } from "./shared";
import { usable, placeholder } from "./shorthand";
import { transformTags } from "./tags";

export type StoryRow = HistoryMessage & { name?: string };
export const rowSignature = (row: StoryRow): string => JSON.stringify([row.index_in_chat, row.role, row.name ?? null, row.swipe_id, row.swipe_dates?.[row.swipe_id] ?? null, row.content]);
export const helperSourceSignature=(row:StoryRow):string=>rowSignature({...row,content:transformTags(row.content,"strip")});
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const nameOfPlace = (state: State) => {
  const v = state.scene.location?.value;
  return v && typeof v === "object" && "name" in v ? v.name : "";
};
const namesPresent = (state: State): string[] => Array.isArray(state.scene.present?.value) ? state.scene.present!.value as string[] : [];
export function evidenceValid(evidence: string | undefined, prose: string): boolean {
  return !!evidence && evidence.trim().length >= 3 && prose.includes(evidence);
}
function evidenceNamesValue(update: Change, old: Cell): boolean {
  const values = (v: Cell["value"]): string[] => typeof v === "string" ? [v] : Array.isArray(v) ? v :
    "name" in v ? [v.name] : [...v.worn.map(item => `worn\u0001${item}`), ...v.removed.map(item => `removed\u0001${item}`)];
  const previous = new Set(values(old.value).map(normalize));
  const additions = values(update.value).filter(v => !previous.has(normalize(v)));
  // A removal-only replacement still needs a quote naming what was removed.
  const changed = additions.length ? additions : values(old.value).filter(v => !values(update.value).map(normalize).includes(normalize(v)));
  return changed.length > 0 && changed.every(v => {
    const text = v.includes("\u0001") ? v.slice(v.indexOf("\u0001") + 1) : v;
    return text.trim() && normalize(update.evidence ?? "").includes(normalize(text));
  });
}
function setCell(old: Cell | undefined, update: Change | undefined, at: Origin, prose: string,
  infer: boolean): Cell | undefined {
  if (!update || !usable(update.value)) return old;
  if (old && same(old.value, update.value)) return old;
  if (update.inferred && (!infer || old)) return old;
  if (old && old.by === "user" &&
    (at.index <= old.at.index || !evidenceValid(update.evidence, prose) || !evidenceNamesValue(update, old))) return old;
  return { value: update.value, by: "ai", at, inferred: update.inferred === true };
}
function notice(state: State, text: string): void { if (!state.notices.includes(text)) state.notices.push(text); }
function namedChanges(evidence: string | undefined, values: [string | undefined, string][]): boolean {
  return values.every(([value, old]) => value === undefined || value === old ||
    (!!value.trim() && normalize(evidence ?? "").includes(normalize(value))));
}

function legacyPatch(content: string): Patch | null {
  const legacy = parseLegacy(content);
  if (legacy.invalidTracker) return null;
  const patch = emptyPatch();
  for (const key of ["location", "time", "present"] as const) {
    const value = legacy.patch[key]; if (value !== undefined) patch.scene[key] = change(key, value);
  }
  if (legacy.patch.weather !== undefined) patch.weather = change("weather", legacy.patch.weather);
  // Legacy notes remain in the preserved legacy payload; never guess their category.
  return patch;
}

export function replay(document: Document, rows: StoryRow[], playerNames: string[], report?: (row: StoryRow, issues: ParseIssue[]) => void): Document {
  const next = structuredClone(document);
  const state = emptyState(); state.notices = [...document.notices]; next.state = state; next.accepted = [];
  const players = new Set(playerNames.map(normalize).filter(Boolean));
  // A saved user message is authoritative evidence of that row's author name.
  for (const row of rows) if (row.role === "user" && row.name?.trim()) players.add(normalize(row.name));
  // A user's display-name correction must not remove player-field restrictions.
  for (const edit of document.edits) if (edit.target === "contact" && edit.rename && players.has(normalize(edit.name ?? ""))) players.add(normalize(edit.rename));
  const previous = new Map(document.accepted.map(e => [JSON.stringify([e.at.id, e.at.variant]), e]));
  const knownNotes = new Set(SECTIONS.flatMap(s => document.state.notes[s].map(n => `${s}/${normalize(n.name)}`)));
  const tombstones = new Set<string>();
  let oldNotes: string[] = [];
  let oldDetails = "";
  const legacyEntries = document.legacy ? readSnapshot(document.legacy, document.chatId).entries : [];
  const sorted = [...rows].sort((a, b) => a.index_in_chat - b.index_in_chat);
  const ids = new Set<string>(); const indexes = new Set<number>();
  for (const row of sorted) {
    if (row.chat_id !== document.chatId || ids.has(row.id) || indexes.has(row.index_in_chat) ||
      !row.id || !Number.isInteger(row.index_in_chat) || row.index_in_chat < 0) throw new Error("Invalid history");
    ids.add(row.id); indexes.add(row.index_in_chat);
  }
  const displayPlayers = new Map<string, string>();
  for (const name of [...playerNames, ...rows.filter(r => r.role === "user").map(r => r.name ?? "")]) {
    if (name.trim()) displayPlayers.set(normalize(name), name.trim());
  }
  next.playerNames = [...displayPlayers.values()];
  for (const [key, name] of displayPlayers) if (players.has(key) && state.contacts.length < 30) state.contacts.push({ name, player: true, fields: {} });
  const editsByIndex = new Map<number, ManualEdit[]>();
  for (const edit of document.edits) {
    const anchor = sorted.find(r => r.id === edit.after);
    const index = anchor?.index_in_chat ?? Math.min(edit.index, sorted.at(-1)?.index_in_chat ?? -1);
    editsByIndex.set(index, [...editsByIndex.get(index) ?? [], edit]);
  }
  const manualAt = (index: number) => {
    for (const edit of editsByIndex.get(index) ?? []) applyManual(state, edit, players, tombstones,document.settings.aiPlayerTexts);
  };
  manualAt(-1);
  for (const row of sorted) {
    const at = { id: row.id, index: row.index_in_chat,
      variant: JSON.stringify([row.swipe_id, row.swipe_dates?.[row.swipe_id] ?? null]) };
    if (row.role !== "system") {
      const parsed = parseExpandedReply(row.content);
      const prior = previous.get(JSON.stringify([at.id, at.variant]));
      const oldFormat = row.content.includes("\nnotes=") || row.content.includes("\ndetails=");
      if (row.role === "assistant") {
        const validLegacy = oldFormat && !parseLegacy(row.content).invalidTracker;
        report?.(row, validLegacy ? [] : parsed.issues);
      }
      if (row.role === "assistant" && oldFormat) {
        const old = parseLegacy(row.content);
        if (!old.invalidTracker) {
          if (old.patch.notes) oldNotes = old.patch.notes;
          if (old.patch.details) oldDetails = old.patch.details;
        }
      }
      if (row.role === "assistant" && parsed.patch === null) {
        const legacyEntry = legacyEntries.find(e => e.source.messageId === at.id && e.source.variant === at.variant);
        if (legacyEntry?.patch.notes) oldNotes = legacyEntry.patch.notes;
        if (legacyEntry?.patch.details) oldDetails = legacyEntry.patch.details;
      }
      const patch = row.role === "user" ? {...emptyPatch(),calls:parsed.patch?.calls,bank:parsed.patch?.bank,transactions:parsed.patch?.transactions} : parsed.patch ?? (oldFormat ? legacyPatch(row.content) : null) ?? prior?.patch ?? emptyPatch();
      // For a malformed edit to the same saved source, retain only its rejected
      // top-level fields. Valid lines still replace their old contributions.
      if (parsed.patch && prior && row.role === "assistant") for (const key of parsed.invalidFields) {
        if (key.includes(":")) {
          const [section,...parts]=key.split(":"); const name=parts.join(":");
          if(section==="contacts") { const old=prior.patch.contacts.find(c=>normalize(c.name)===name);if(old&&!patch.contacts.some(c=>normalize(c.name)===name))patch.contacts.push(old); }
          else if(section==="locations") { const old=prior.patch.locations.find(c=>normalize(c.name)===name);if(old&&!patch.locations.some(c=>normalize(c.name)===name))patch.locations.push(old); }
          else if(["calls","bank","transactions"].includes(section)){const k=section as "calls";const match=normalize(name.split(" | ")[0]);const current=(patch[k]??=[]) as unknown as Record<string,unknown>[];for(const old of (prior.patch[k]??[]) as unknown as Record<string,unknown>[])if(normalize(String(old.name??old.description))===match&&!current.some(v=>JSON.stringify(v)===JSON.stringify(old)))current.push(old);}
          else if(SECTIONS.includes(section as Section)) { const k=section as Section;const old=prior.patch.notes[k]?.find(n=>normalize(n.name)===name);if(old&&!(patch.notes[k]??=[]).some(n=>normalize(n.name)===name))patch.notes[k]!.push(old); }
        }
        else if (SCENE_KEYS.includes(key as never)) patch.scene[key as typeof SCENE_KEYS[number]] = prior.patch.scene[key as typeof SCENE_KEYS[number]];
        else if (["calls","bank","transactions"].includes(key)) {const k=key as "calls";patch[k]=prior.patch[k];}
        else if (key === "weather") patch.weather = prior.patch.weather;
        else if (key === "contacts") patch.contacts = prior.patch.contacts;
        else if (key === "locations") patch.locations = prior.patch.locations;
        else if (SECTIONS.includes(key as never)) patch.notes[key as Section] = prior.patch.notes[key as Section];
      }
      const texts = parsed.badTexts ? prior?.texts ?? parsed.texts : parsed.texts;
      const emails=parsed.badEmails&&prior?[...parsed.emails,...(prior.emails??[]).filter(old=>!parsed.emails.some(e=>e.from===old.from&&e.subject===old.subject&&e.time===old.time))]:parsed.emails;
      const accepted: Accepted = { at, patch, texts,emails, role: row.role, ...(row.name ? { name: row.name } : {}), prose: parsed.prose };
      next.accepted.push(accepted);
      if (row.role === "assistant") applyAI(next, patch, at, parsed.prose, players, tombstones, knownNotes);
      const lastUser=[...sorted].reverse().find(r=>r.index_in_chat<row.index_in_chat&&r.role==="user");
      const needsBankFallback=parsed.patch===null||parsed.invalidFields.some(k=>k==="bank"||k.startsWith("bank:"));
      const proven=needsBankFallback?prior?.bankProof??[]:[];
      const proofRow:StoryRow={...row,content:proven.map(b=>[b.name,b.balance,b.evidence??""].join(" ")).join("\n")};
      applyActivities(next,patch,emails,at,[...(lastUser?[lastUser]:[]),row,...(proven.length?[proofRow]:[])],players,row.role==="user",tombstones);
      accepted.bankProof=(patch.bank??[]).filter(b=>state.bank.some(saved=>saved.at.id===at.id&&saved.at.variant===at.variant&&normalize(saved.name)===normalize(b.name)&&saved.balance===b.balance));
      for (const [ordinal, text] of texts.entries()) {
        let from = text.from; let direction: "incoming" | "outgoing" = "incoming";
        if (row.role === "user") {
          if (!row.name || normalize(text.from) !== normalize(row.name)) continue;
          from = row.name; direction = "outgoing";
        } else {
          // Without known player identity, reject ambiguous AI-authored texts.
          if (!players.size) continue;
          if (players.has(normalize(text.from))) {
            if (!document.settings.aiPlayerTexts) continue;
            direction = "outgoing";
          }
        }
        state.messages.push({ ...text, from, direction, at, id: JSON.stringify([at.id, at.variant, ordinal]) });
      }
    }
    for (const entry of document.helperEntries ?? []) if (entry.at.id === row.id &&
      entry.at.variant === at.variant && entry.sources.every(s => sorted.some(r => r.id === s.id && helperSourceSignature(r) === s.signature))) {
      const helperPatch=validateExpanded(entry.values);applyAI(next, helperPatch, entry.at, entry.prose, players, tombstones, knownNotes);
      applyActivities(next,helperPatch,[],entry.at,sorted.filter(r=>entry.sources.some(s=>s.id===r.id)),players,false,tombstones);
    }
    manualAt(row.index_in_chat);
  }
  // Untyped Step 2 notes cannot be assigned a story-log category without guessing.
  // Preserve them in Misc, not marked user-added and not sent to AI without opt-in.
  for (const [i, detail] of [...oldNotes, ...(oldDetails ? [oldDetails] : [])].entries()) {
    const name = `Earlier note ${i + 1}`;
    if (state.notes.misc.some(n => normalize(n.name) === normalize(name)) || tombstones.has(`note/misc/${normalize(name)}`)) continue;
    state.notes.misc.push({ name, detail, context: "Preserved from the earlier tracker", resolved: false,
      sendToAI: false, by: "ai", addedByUser: false, updated: false, at: { id: "legacy", index: -1, variant: "legacy" } });
  }
  next.notices = [...state.notices];
  return next;
}

function applyAI(doc: Document, patch: Patch, at: Origin, prose: string, players: Set<string>, tombstones: Set<string>, knownNotes: Set<string>): void {
  const state = doc.state;
  for (const key of SCENE_KEYS) state.scene[key] = setCell(state.scene[key], patch.scene[key], at, prose, false);
  state.weather = setCell(state.weather, patch.weather, at, prose, false);
  for (const update of patch.contacts) {
    const rejectedKey = JSON.stringify([at.id, at.variant, "contacts", update]);
    if (doc.rejected.includes(rejectedKey)) continue;
    const key = normalize(update.name); if (tombstones.has(`contact/${key}`)) continue;
    let contact = state.contacts.find(c => normalize(c.name) === key);
    if (!contact) {
      if (state.contacts.length >= 30) { notice(state, "Contacts is full (30/30). Delete a contact to make room."); doc.rejected.push(rejectedKey); continue; }
      if (!namesPresent(state).some(name=>normalize(name)===key) || placeholder(update.name)) continue;
      if (!Object.values(update.fields).some(c=>c&&usable(c.value))) continue;
      contact = { name: update.name, player: players.has(key), fields: {} }; state.contacts.push(contact);
    }
    contact.player = players.has(key);
    for (const field of CONTACT_KEYS) {
      if (contact.player && !["physical", "position", "attire"].includes(field)) continue;
      const c = update.fields[field];
      const inferenceKey = JSON.stringify([at.id, at.variant, key, field, c]);
      const allowed = doc.settings.inferMissing || doc.inferences.includes(inferenceKey);
      const old = contact.fields[field];
      contact.fields[field] = setCell(old, c, at, prose, allowed);
      if (contact.fields[field]?.inferred && contact.fields[field] !== old && !doc.inferences.includes(inferenceKey)) doc.inferences.push(inferenceKey);
    }
  }
  for (const name of namesPresent(state)) {
    const key = normalize(name);
    if (tombstones.has(`contact/${key}`) || state.contacts.some(c => normalize(c.name) === key)) continue;
    if (state.contacts.length >= 30) { notice(state, "Contacts is full (30/30). Delete a contact to make room."); continue; }
    state.contacts.push({ name, player: players.has(key), fields: {} });
  }
  // Presence is the sole source for here-now, not a second writable contact flag.
  for (const contact of state.contacts) if (namesPresent(state).map(normalize).includes(normalize(contact.name))) {
    const place = nameOfPlace(state); if (place) contact.lastSeen = place;
  }
  for (const rawUpdate of patch.locations) {
    const update={...rawUpdate,description:rawUpdate.description?.trim()?rawUpdate.description:undefined,relation:rawUpdate.relation?.trim()?rawUpdate.relation:undefined};
    const rejectedKey = JSON.stringify([at.id, at.variant, "locations", update]);
    if (doc.rejected.includes(rejectedKey)) continue;
    const key = normalize(update.name); if (tombstones.has(`location/${key}`)) continue;
    const old = state.locations.find(p => normalize(p.name) === key);
    if (placeholder(update.name) || (update.description!==undefined && (!update.description.trim()||placeholder(update.description))) ||
      (update.relation!==undefined && (!update.relation.trim()||placeholder(update.relation)))) continue;
    if (!old && key===normalize(nameOfPlace(state))) continue;
    if (!old && state.locations.length >= 30) { notice(state, "Locations is full (30/30). Delete a place to make room."); doc.rejected.push(rejectedKey); continue; }
    if (!old && !prose.toLocaleLowerCase().includes(update.name.toLocaleLowerCase())) continue;
    if (old?.by === "user" && (at.index <= old.at.index || !evidenceValid(update.evidence, prose) ||
      !namedChanges(update.evidence, [[update.description, old.description], [update.relation, old.relation]]))) continue;
    const value = { name: old?.name ?? update.name, description: update.description ?? old?.description ?? "",
      relation: update.relation ?? old?.relation ?? "", at, by: "ai" as const, updated: !!old };
    if (old) Object.assign(old, value); else state.locations.push(value);
  }
  for (const section of SECTIONS.filter(s => s !== "misc")) for (const rawUpdate of patch.notes[section] ?? []) {
    const update={...rawUpdate,detail:rawUpdate.detail?.trim()?rawUpdate.detail:undefined,context:rawUpdate.context?.trim()?rawUpdate.context:undefined};
    const rejectedKey = JSON.stringify([at.id, at.variant, section, update]);
    if (doc.rejected.includes(rejectedKey)) continue;
    const key = normalize(update.name); if (tombstones.has(`note/${section}/${key}`)) continue;
    if (placeholder(update.name) || [update.detail,update.context].some(v=>v!==undefined&&(!v.trim()||placeholder(v)))) continue;
    const notes = state.notes[section]; const old = notes.find(n => normalize(n.name) === key);
    if (!old && !update.resolved && notes.filter(n => !n.resolved).length >= doc.settings.notesPerSection && !knownNotes.has(`${section}/${key}`)) {
      notice(state, `${section[0].toUpperCase() + section.slice(1)} is full (${notes.filter(n => !n.resolved).length}/${doc.settings.notesPerSection}). Delete a note to make room.`);
      doc.rejected.push(rejectedKey); continue;
    }
    if (!old && update.resolved) continue; // Do not manufacture an already-resolved plot.
    if (old?.by === "user" && (at.index <= old.at.index || !evidenceValid(update.evidence, prose) ||
      !namedChanges(update.evidence, [[update.detail, old.detail], [update.context, old.context]]) ||
      (update.resolved !== undefined && update.resolved !== old.resolved &&
        !["resolved", "completed", "fulfilled", "done", "reopened", "pending"].some(word => normalize(update.evidence ?? "").includes(word))))) continue;
    const detail = update.detail ?? old?.detail ?? ""; const context = update.context ?? old?.context ?? "";
    const resolved = section === "plots" ? update.resolved ?? old?.resolved ?? false : false;
    const changed = !!old && (detail !== old.detail || context !== old.context || resolved !== old.resolved);
    const value: Note = { name: old?.name ?? update.name, detail, context, resolved, sendToAI: false,
      at: changed || !old ? at : old.at, by: changed || !old ? "ai" : old.by,
      addedByUser: old?.addedByUser ?? false, updated: old?.updated === true || changed };
    if (old) Object.assign(old, value); else notes.push(value);
  }
}

export function applyManual(state: State, edit: ManualEdit, players: Set<string>, tombstones: Set<string>,allowPlayer=false): void {
  if(applyActivityEdit(state,edit,tombstones,players,allowPlayer||edit.playerWritingAllowed===true))return;
  const at = { id: `edit:${edit.id}`, index: edit.index, variant: "user" };
  if (edit.target === "scene" || edit.target === "weather") {
    const field = edit.target === "weather" ? "weather" : edit.field;
    if (!field || (field !== "weather" && !SCENE_KEYS.includes(field as never))) throw new Error("Invalid editable field");
    const value = change(field, edit.value); if (!value) throw new Error("An edit needs a value");
    const cell: Cell = { value: value.value, by: "user", at, inferred: false };
    if (field === "weather") state.weather = cell; else state.scene[field as typeof SCENE_KEYS[number]] = cell;
    return;
  }
  if (!short(edit.name, 100) || !edit.name.trim()) throw new Error("Missing name");
  const name = edit.name.trim(); const key = normalize(name);
  const renamed = edit.rename === undefined ? name : edit.rename;
  if (!short(renamed, 100) || !renamed.trim()) throw new Error("Give this entry a name");
  const newName = renamed.trim(); const newKey = normalize(newName);
  const renameCurrent = () => {
    const present = state.scene.present;
    if (present && Array.isArray(present.value) && present.value.some(n => normalize(n) === key)) {
      state.scene.present = { value: present.value.map(n => normalize(n) === key ? newName : n), by: "user", at, inferred: false };
    }
  };
  if (edit.target === "contact") {
    const old = state.contacts.find(c => normalize(c.name) === key);
    if (edit.remove) { state.contacts = state.contacts.filter(c => c !== old); tombstones.add(`contact/${key}`); return; }
    if (!isRecord(edit.value)) throw new Error("Invalid contact edit");
    if (!old && state.contacts.length >= 30) throw new Error("Contacts is full");
    const contact: Contact = old ?? { name, player: players.has(key), fields: {} };
    if (newKey !== key && state.contacts.some(c => normalize(c.name) === newKey)) throw new Error("A contact with that name already exists");
    for (const [field, raw] of Object.entries(edit.value)) {
      if (!CONTACT_KEYS.includes(field as never) || (contact.player && !["physical", "position", "attire"].includes(field))) throw new Error("Invalid player/contact field");
      const value = change(field, raw); if (value) contact.fields[field as typeof CONTACT_KEYS[number]] = { value: value.value, by: "user", at, inferred: false };
    }
    contact.name = newName; contact.editedByUser = true;
    if (newKey !== key) { tombstones.add(`contact/${key}`); renameCurrent(); }
    if (!old) state.contacts.push(contact); tombstones.delete(`contact/${newKey}`); return;
  }
  if (edit.target === "location") {
    const old = state.locations.find(p => normalize(p.name) === key);
    if (edit.remove) { state.locations = state.locations.filter(p => p !== old); tombstones.add(`location/${key}`); return; }
    if (!isRecord(edit.value) || !short(edit.value.description) || !short(edit.value.relation)) throw new Error("Invalid place edit");
    if (!old && state.locations.length >= 30) throw new Error("Locations is full");
    if (newKey !== key && state.locations.some(p => normalize(p.name) === newKey)) throw new Error("A place with that name already exists");
    const value = { name: newName, description: edit.value.description, relation: edit.value.relation, at, by: "user" as const, updated: !!old };
    if (newKey !== key) {
      tombstones.add(`location/${key}`);
      const current = state.scene.location;
      if (current && typeof current.value === "object" && "name" in current.value && normalize(current.value.name) === key) {
        state.scene.location = { value: { ...current.value, name: newName }, by: "user", at, inferred: false };
      }
    }
    if (old) Object.assign(old, value); else state.locations.push(value); tombstones.delete(`location/${newKey}`); return;
  }
  const section = edit.section; if (!section || !SECTIONS.includes(section)) throw new Error("Invalid section");
  const notes = state.notes[section]; const old = notes.find(n => normalize(n.name) === key);
  if (edit.remove) { state.notes[section] = notes.filter(n => n !== old); tombstones.add(`note/${section}/${key}`); return; }
  const value = validateNote({ ...(isRecord(edit.value) ? edit.value : {}), name }, true);
  if (newKey !== key && notes.some(n => normalize(n.name) === newKey)) throw new Error("A note with that name already exists");
  const note: Note = { name: newName, detail: value.detail ?? old?.detail ?? "", context: value.context ?? old?.context ?? "",
    resolved: section === "plots" && (value.resolved ?? old?.resolved ?? false),
    sendToAI: isRecord(edit.value) && typeof edit.value.sendToAI === "boolean" ? edit.value.sendToAI : old?.sendToAI ?? false,
    at, by: "user", addedByUser: old?.addedByUser ?? !old, updated: !!old };
  if (newKey !== key) tombstones.add(`note/${section}/${key}`);
  if (old) Object.assign(old, note); else notes.push(note); tombstones.delete(`note/${section}/${newKey}`);
}

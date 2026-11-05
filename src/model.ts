import { isRecord } from "./shared";

export const SCENE_KEYS = ["location", "time", "date", "present"] as const;
export const CONTACT_KEYS = ["roles", "physical", "mood", "position", "attire", "thoughts"] as const;
export const SECTIONS = ["people", "items", "rules", "plots", "misc"] as const;
export const SWITCHES = [...SCENE_KEYS.map(k => `scene.${k}`), ...CONTACT_KEYS.map(k => `contacts.${k}`),
  ...SECTIONS.map(k => `notes.${k}`), "locations", "weather", "messages","calls","email","bank.balance","bank.transactions"] as const;
export type SceneKey = typeof SCENE_KEYS[number];
export type ContactKey = typeof CONTACT_KEYS[number];
export type Section = typeof SECTIONS[number];
export type Value = string | string[] | { name: string; wider: string[] } | { worn: string[]; removed: string[] };
export interface Origin { id: string; index: number; variant: string }
export interface Cell { value: Value; by: "ai" | "user"; at: Origin; inferred: boolean }
export interface Change { value: Value; evidence?: string; inferred?: boolean }
export interface ContactPatch { name: string; fields: Partial<Record<ContactKey, Change>> }
export interface PlacePatch { name: string; description?: string; relation?: string; evidence?: string }
export interface NotePatch { name: string; detail?: string; context?: string; resolved?: boolean; evidence?: string }
export interface CallData {name:string;direction:"in"|"out"|"missed";time?:string;count?:number;source?:string;evidence?:string}
export interface BankData {name:string;balance:string;time?:string;evidence?:string}
export interface TransactionData {description:string;amount:string;time?:string}
export interface EmailData {from:string;to?:string;subject:string;body:string;time?:string}
export type ActivityEntry<T> = T & {id:string;at:Origin;by:"ai"|"user";legacyIds?:string[]};
export interface Patch {
  calls?:CallData[];bank?:BankData[];transactions?:TransactionData[];
  scene: Partial<Record<SceneKey, Change>>; weather?: Change;
  contacts: ContactPatch[]; locations: PlacePatch[]; notes: Partial<Record<Section, NotePatch[]>>;
}
export interface TextData { from: string; text: string; time?: string; to?: string }
export interface SavedMessage extends TextData { id: string; direction: "incoming" | "outgoing"; at: Origin }
export interface Contact { name: string; player: boolean; fields: Partial<Record<ContactKey, Cell>>; lastSeen?: string; editedByUser?: boolean }
export interface Place { name: string; description: string; relation: string; at: Origin; by: "ai" | "user"; updated: boolean }
export interface Note { name: string; detail: string; context: string; resolved: boolean; sendToAI: boolean;
  at: Origin; by: "ai" | "user"; addedByUser: boolean; updated: boolean }
export interface State {
  calls:ActivityEntry<CallData>[];bank:ActivityEntry<BankData>[];transactions:ActivityEntry<TransactionData>[];emails:(ActivityEntry<EmailData>&{direction:"incoming"|"outgoing"})[];
  scene: Partial<Record<SceneKey, Cell>>; weather?: Cell; contacts: Contact[]; locations: Place[];
  notes: Record<Section, Note[]>; messages: SavedMessage[]; notices: string[];
}
export const CORE_APPS = ["Scene","Weather","Locations","Notes","Contacts","Messages"] as const;
export const OPTIONAL_APPS=["Calls","Email","Bank"] as const;
export const ALL_APPS=[...CORE_APPS,...OPTIONAL_APPS] as const;
export type CoreApp=typeof ALL_APPS[number];
export const APP_FIELDS:Record<CoreApp,string[]>={Scene:SCENE_KEYS.map(k=>`scene.${k}`),Weather:["weather"],Locations:["locations"],Notes:SECTIONS.map(k=>`notes.${k}`),Contacts:CONTACT_KEYS.map(k=>`contacts.${k}`),Messages:["messages"],Calls:["calls"],Email:["email"],Bank:["bank.balance","bank.transactions"]};
export interface Settings {
  apps:Record<CoreApp,boolean>;
  enabled: Record<string, boolean>; aiPlayerTexts: boolean; inferMissing: boolean;
  keepTexts: number; keepTrackers: number; notesPerSection: number; logLines: number;
  source: "main" | "helper";
  connection_id: string | null; helperMessages: number;
}
export interface HelperEntry { id: string; at: Origin; sources: { id: string; signature: string }[]; values: Record<string, unknown>; prose: string }
export interface ManualEdit {
  playerWritingAllowed?:boolean;
  id: string; after: string | null; index: number;
  target: "scene" | "weather" | "contact" | "location" | "note" | "call" | "email" | "bank" | "transaction";
  name?: string; rename?: string; field?: string; section?: Section; value?: unknown; remove?: boolean;
}
export interface Accepted { bankProof?:BankData[];at: Origin; patch: Patch; emails?:EmailData[]; texts: TextData[]; role: "user" | "assistant"; name?: string; prose: string }
export interface Document {
  callAdmissions?:string[];
  personalReads?:{seen:Record<string,string>;available?:boolean};
  schema: 2; chatId: string; revision: number; settings: Settings; edits: ManualEdit[];
  accepted: Accepted[]; state: State; playerNames: string[]; legacy?: unknown;
  rejected: string[];
  notices: string[];
  inferences: string[];
  currentPlayer?: string;
  helperOwner?: string;
  helperEntries: HelperEntry[];
  helperAttempts: string[];
}
export const normalize = (name: string) => name.normalize("NFKC").trim().toLocaleLowerCase("en-US").split(" ").filter(Boolean).join(" ");
export function defaults(): Settings {
  return { apps:Object.fromEntries(ALL_APPS.map(a=>[a,(CORE_APPS as readonly string[]).includes(a)])) as Record<CoreApp,boolean>, enabled: Object.fromEntries(SWITCHES.map(k => [k, k !== "contacts.thoughts"])), aiPlayerTexts: false,
    inferMissing: false, keepTexts: 3, keepTrackers: 0, notesPerSection: 10, logLines: 20, source: "main", connection_id: null, helperMessages: 3 };
}
export function readSettings(input: unknown): Settings {
  if (!isRecord(input)) throw new Error("Invalid settings");
  const out = defaults();
  for (const key of Object.keys(input)) {
    if (!(key in out)) throw new Error("Unknown setting");
    if(key==="apps") {
      if(!isRecord(input.apps))throw new Error("Invalid apps");
      for(const [app,on]of Object.entries(input.apps)){if(!ALL_APPS.includes(app as CoreApp)||typeof on!=="boolean")throw new Error("Invalid app");out.apps[app as CoreApp]=on;}
    } else if (key === "enabled") {
      if (!isRecord(input.enabled)) throw new Error("Invalid switches");
      for (const [name, value] of Object.entries(input.enabled)) {
        if (!SWITCHES.includes(name as never) || typeof value !== "boolean") throw new Error("Invalid switch");
        out.enabled[name] = value;
      }
    } else if (["aiPlayerTexts", "inferMissing"].includes(key)) {
      if (typeof input[key] !== "boolean") throw new Error("Invalid switch");
      Object.assign(out, { [key]: input[key] });
    } else if (key === "connection_id") {
      if (input.connection_id !== null && (typeof input.connection_id !== "string" || !input.connection_id || input.connection_id.length > 256)) throw new Error("Invalid connection");
      out.connection_id = input.connection_id;
    } else if (key === "source") {
      if (input.source !== "main" && input.source !== "helper") throw new Error("Invalid source");
      out.source = input.source;
    } else {
      const n = input[key];
      if (typeof n !== "number" || !Number.isSafeInteger(n) || n < (key === "keepTrackers" ? 0 : key === "notesPerSection" ? 3 : 1) ||
        (key === "notesPerSection" && n > 30) || (key === "helperMessages" && n > 10)) throw new Error("Invalid number");
      Object.assign(out, { [key]: n });
    }
  }
  if(input.apps===undefined)for(const app of CORE_APPS)out.apps[app]=APP_FIELDS[app].some(k=>out.enabled[k]);
  return out;
}
export function effectiveDocument(doc:Document):Document {
  const enabled={...doc.settings.enabled};for(const app of ALL_APPS)if(!doc.settings.apps[app])for(const key of APP_FIELDS[app])enabled[key]=false;
  return {...doc,settings:{...doc.settings,enabled}};
}
export const emptyPatch = (): Patch => ({ scene: {}, contacts: [], locations: [], notes: {} });
export const emptyState = (): State => ({ calls:[],bank:[],transactions:[],emails:[],scene: {}, contacts: [], locations: [], notes: { people: [], items: [], rules: [], plots: [], misc: [] }, messages: [], notices: [] });
export const emptyDocument = (chatId: string): Document => ({ schema: 2, chatId, revision: 0,
  settings: defaults(), edits: [], accepted: [], state: emptyState(), playerNames: [], rejected: [], notices: [], inferences: [], helperEntries: [], helperAttempts: [] });

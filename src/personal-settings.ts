import { ALL_APPS, SWITCHES, defaults, readSettings, type Settings } from "./model";
import { isRecord } from "./shared";
export const SYNTAX_TOKEN = "[[phone_syntax]]";
export type WordingTarget = "main" | "helper";
export type PresetSettings = Pick<Settings,"apps"|"enabled"|"notesPerSection"|"logLines"|"keepTrackers"|"keepTexts">;
export interface SettingsPreset { id:string; name:string; settings:PresetSettings }
export interface PromptWording { id:string; name:string; text:string }
export interface PersonalSettings { revision:number; presets:SettingsPreset[]; wordings:Record<WordingTarget,PromptWording[]>; selected:Record<WordingTarget,string> }
export const emptyPersonal=():PersonalSettings=>({revision:0,presets:[],wordings:{main:[],helper:[]},selected:{main:"default",helper:"default"}});
export const presetSnapshot=(s:Settings):PresetSettings=>({apps:{...s.apps},enabled:{...s.enabled},notesPerSection:s.notesPerSection,logLines:s.logLines,keepTrackers:s.keepTrackers,keepTexts:s.keepTexts});
export function validatePreset(value:unknown):PresetSettings {
 if(!isRecord(value)||Object.keys(value).sort().join()!==["apps","enabled","notesPerSection","logLines","keepTrackers","keepTexts"].sort().join())throw Error("Invalid preset");
 const apps=value.apps,enabled=value.enabled;
 if(!isRecord(apps)||ALL_APPS.some(k=>typeof apps[k]!=="boolean")||!isRecord(enabled)||SWITCHES.some(k=>typeof enabled[k]!=="boolean"))throw Error("Invalid preset");
 return presetSnapshot(readSettings(value));
}
export function builtInPresets():SettingsPreset[] {
 const minimal=defaults();for(const app of ALL_APPS)minimal.apps[app]=["Scene","Weather","Messages"].includes(app);
 return [{id:"default",name:"Default",settings:presetSnapshot(defaults())},{id:"minimal",name:"Minimal",settings:presetSnapshot(minimal)}];
}
function name(value:unknown):string {if(typeof value!=="string"||!value.trim()||value.trim().length>40||/[\r\n<>]/.test(value))throw Error("Use a name of 1 to 40 characters.");return value.trim();}
function target(value:unknown):WordingTarget {if(value!=="main"&&value!=="helper")throw Error("Invalid wording");return value;}
export const validWording=(value:unknown):value is string=>typeof value==="string"&&!!value.trim()&&value.length<=4000;
export function readPersonal(value:unknown,warn:(s:string)=>void=()=>{}):PersonalSettings {
 const out=emptyPersonal();if(!isRecord(value))return out;
 out.revision=Number.isSafeInteger(value.revision)&&Number(value.revision)>=0?Number(value.revision):0;
 if(Array.isArray(value.presets))for(const p of value.presets.slice(0,20))try {if(!isRecord(p)||typeof p.id!=="string"||["default","minimal"].includes(p.id)||out.presets.some(x=>x.id===p.id))throw Error();out.presets.push({id:p.id,name:name(p.name),settings:validatePreset(p.settings)});}catch{warn("Lumi Phone Tracker: invalid saved preset ignored.");}
 for(const t of ["main","helper"] as const) {
  if(isRecord(value.wordings)&&Array.isArray(value.wordings[t]))for(const w of value.wordings[t].slice(0,10)) {
   if(!isRecord(w)||typeof w.id!=="string"||w.id==="default"||out.wordings[t].some(x=>x.id===w.id))continue;
   try {out.wordings[t].push({id:w.id,name:name(w.name),text:validWording(w.text)?w.text:""});}catch{continue;}
  }
  const selected=isRecord(value.selected)?value.selected[t]:undefined;
  if(typeof selected==="string"&&out.wordings[t].some(w=>w.id===selected))out.selected[t]=selected;
  if(out.selected[t]!=="default"&&!validWording(out.wordings[t].find(w=>w.id===out.selected[t])?.text)){out.selected[t]="default";warn("Lumi Phone Tracker: invalid prompt wording; using Default.");}
 }
 return out;
}
export function selectedWording(p:PersonalSettings,t:WordingTarget):string|undefined {return p.wordings[t].find(w=>w.id===p.selected[t])?.text;}
export class PersonalStore {
 private queues=new Map<string,Promise<unknown>>();
 constructor(private io:{read(userId:string):Promise<unknown>;write(userId:string,value:PersonalSettings):Promise<void>;warn(text:string):void}){}
 private serial<T>(user:string,action:()=>Promise<T>):Promise<T>{if(!user.trim())return Promise.reject(Error("Missing user"));const task=(this.queues.get(user)??Promise.resolve()).catch(()=>{}).then(action);this.queues.set(user,task);const done=()=>{if(this.queues.get(user)===task)this.queues.delete(user);};void task.then(done,done);return task;}
 read(user:string):Promise<PersonalSettings>{return this.serial(user,async()=>readPersonal(await this.io.read(user),this.io.warn));}
 update(user:string,revision:number,change:unknown,snapshot?:Settings):Promise<PersonalSettings>{return this.serial(user,async()=>{
  const p=readPersonal(await this.io.read(user),this.io.warn);if(p.revision!==revision&&!(isRecord(change)&&change.kind==="wording_select"&&change.id==="default"))throw Error("Your saved choices changed. Reopen this section.");
  if(!isRecord(change))throw Error("Invalid change");
  if(change.kind==="preset_save") {if(!snapshot)throw Error("Open a chat first.");if(p.presets.length>=20)throw Error("You can save up to 20 presets.");const title=name(change.name);if([...builtInPresets(),...p.presets].some(x=>x.name.toLowerCase()===title.toLowerCase()))throw Error("Choose a different name.");p.presets.push({id:crypto.randomUUID(),name:title,settings:presetSnapshot(snapshot)});}
  else if(change.kind==="preset_rename"||change.kind==="preset_delete") {const i=p.presets.findIndex(x=>x.id===change.id);if(i<0)throw Error("Built-in presets are read-only.");if(change.kind==="preset_delete")p.presets.splice(i,1);else{const title=name(change.name);if([...builtInPresets(),...p.presets].some(x=>x.id!==change.id&&x.name.toLowerCase()===title.toLowerCase()))throw Error("Choose a different name.");p.presets[i].name=title;}}
  else if(change.kind==="wording_select") {const t=target(change.target);if(change.id!=="default"&&!p.wordings[t].some(w=>w.id===change.id))throw Error("Wording not found.");p.selected[t]=String(change.id);}
  else if(change.kind==="wording_save") {const t=target(change.target);if(!validWording(change.text)){this.io.warn("Lumi Phone Tracker: invalid prompt wording; using Default.");p.selected[t]="default";}else{const title=name(change.name);const old=p.wordings[t].find(w=>w.id===change.id);if(change.id==="default")throw Error("Default wording is read-only. Copy it first.");if(p.wordings[t].some(w=>w.id!==change.id&&w.name.toLowerCase()===title.toLowerCase())||title.toLowerCase()==="default")throw Error("Choose a different name.");if(old){old.name=title;old.text=change.text;}else{if(p.wordings.main.length+p.wordings.helper.length>=10)throw Error("You can save up to 10 custom wordings.");const w={id:crypto.randomUUID(),name:title,text:change.text};p.wordings[t].push(w);p.selected[t]=w.id;}}}
  else if(change.kind==="wording_delete"){const t=target(change.target),i=p.wordings[t].findIndex(w=>w.id===change.id);if(i<0)throw Error("Default wording is read-only.");p.wordings[t].splice(i,1);if(p.selected[t]===change.id)p.selected[t]="default";}
  else throw Error("Invalid change");
  p.revision++;await this.io.write(user,p);return p;
 });}
}

export interface PersonalReply {personal:PersonalSettings;templates:Record<WordingTarget,string>;preview?:{text:string;characters:number;tokenEstimate:number;warning:string};snapshot?:import("./model").Document}

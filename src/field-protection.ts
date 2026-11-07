import {CONTACT_KEYS,SCENE_KEYS,SECTIONS,normalize,type Document,type State,type ManualEdit,type Origin} from "./model";
import {isRecord} from "./shared";
export interface FieldRef {target:"scene"|"weather"|"contact"|"location"|"note"|"bank";name?:string;section?:string;field:string}
export const fieldKey=(r:FieldRef)=>JSON.stringify([r.target,normalize(r.name??""),r.section??"",r.field]);
export function readFieldRef(v:unknown):FieldRef {
 if(!isRecord(v)||typeof v.target!=="string"||typeof v.field!=="string"||v.name!==undefined&&(typeof v.name!=="string"||!v.name.trim()||v.name.length>100))throw Error("Invalid field");
 const allowed:Record<string,readonly string[]>={scene:SCENE_KEYS,weather:["weather"],contact:CONTACT_KEYS,location:["description","relation"],note:["detail","context","resolved"],bank:["balance","time"]};
 if(!allowed[v.target]?.includes(v.field)||!["scene","weather"].includes(v.target)&&!v.name||v.target==="note"&&!(SECTIONS as readonly unknown[]).includes(v.section))throw Error("Invalid field");
 return {target:v.target as FieldRef["target"],field:v.field,...(typeof v.name==="string"?{name:v.name}:{}),...(v.target==="note"?{section:String(v.section)}:{})};
}
export function fieldValue(s:State,r:FieldRef):unknown {
 if(r.target==="scene")return s.scene[r.field as keyof State["scene"]]?.value;
 if(r.target==="weather")return s.weather?.value;
 if(r.target==="contact")return s.contacts.find(c=>normalize(c.name)===normalize(r.name!))?.fields[r.field as typeof CONTACT_KEYS[number]]?.value;
 const list=r.target==="note"?s.notes[r.section as typeof SECTIONS[number]]:r.target==="location"?s.locations:s.bank;
 return (list.find(v=>normalize(v.name)===normalize(r.name!)) as unknown as Record<string,unknown>|undefined)?.[r.field];
}
export function captureUserVersion(s:State,e:ManualEdit):void {
 if(e.source||e.remove)return;
 if(e.rename&&e.name)for(const [key,version]of Object.entries(s.userVersions??{})){const [target,name,section,field]=JSON.parse(key);if(target===e.target&&name===normalize(e.name)&&(target!=="note"||section===e.section)){(s.userVersions??={})[fieldKey({target,name:e.rename,section,field})]=version;delete s.userVersions![key];}}

 const fields=e.target==="scene"?[e.field!]:e.target==="weather"?["weather"]:isRecord(e.value)?Object.keys(e.value):[];
 for(const field of e.editedFields??fields){try{const r=readFieldRef({target:e.target,name:e.target==="bank"&&isRecord(e.value)?e.value.name:e.rename??e.name,section:e.section,field});const value=fieldValue(s,r);if(value!==undefined)(s.userVersions??={})[fieldKey(r)]={value:structuredClone(value),at:{id:`edit:${e.id}`,index:e.index,variant:"user"}};}catch{/* UI-only flags are not AI-writable fields. */}}
}
const values=(v:unknown):string[]=>typeof v==="string"?[v]:typeof v==="boolean"?[String(v)]:Array.isArray(v)?v.map(String):isRecord(v)&&"name"in v?[String(v.name),...(Array.isArray(v.wider)?v.wider.map(String):[])]:isRecord(v)?[...(Array.isArray(v.worn)?v.worn.map(x=>`worn\u0001${x}`):[]),...(Array.isArray(v.removed)?v.removed.map(x=>`removed\u0001${x}`):[])]:[];
export const editAdmission=(r:FieldRef,value:unknown,at:Origin,evidence?:string)=>JSON.stringify([fieldKey(r),at.id,at.variant,value,evidence]);
/** Preserve already-supported quoted changes when upgrading older journals. No cache values are trusted. */
export function legacyEditAdmissions(doc:Document,helpers:{patch:import("./model").Patch;at:Origin}[]=[]):string[]{
 const out:string[]=[];const add=(patch:import("./model").Patch,at:Origin)=>{
  const push=(r:FieldRef,value:unknown,evidence?:string)=>{if(value!==undefined&&evidence)out.push(editAdmission(r,value,at,evidence));};
  for(const [field,c]of Object.entries(patch.scene))if(c)push({target:"scene",field},c.value,c.evidence);if(patch.weather)push({target:"weather",field:"weather"},patch.weather.value,patch.weather.evidence);
  for(const c of patch.contacts)for(const [field,v]of Object.entries(c.fields))if(v)push({target:"contact",name:c.name,field},v.value,v.evidence);
  for(const p of patch.locations)for(const field of ["description","relation"] as const)push({target:"location",name:p.name,field},p[field],p.evidence);
  for(const section of SECTIONS)for(const n of patch.notes[section]??[])for(const field of ["detail","context","resolved"] as const)push({target:"note",name:n.name,section,field},n[field],n.evidence);
  for(const b of patch.bank??[])for(const field of ["balance","time"] as const)push({target:"bank",name:b.name,field},b[field],b.evidence);
 };for(const e of doc.accepted)add(e.patch,e.at);for(const e of helpers)add(e.patch,e.at);return [...new Set(out)];
}
/** Locks always win. Allowing AI edits still requires a later literal, value-bearing quote. */
export function fieldAllows(doc:Document,r:FieldRef,value:unknown,at:Origin,prose:string,evidence?:string,inferred=false):boolean {
 const same=JSON.stringify(fieldValue(doc.state,r))===JSON.stringify(value);if(same)return true;
 if(doc.fieldLocks?.[fieldKey(r)])return false;
 const previous=doc.state.userVersions?.[fieldKey(r)];if(!previous)return true;
 const admission=editAdmission(r,value,at,evidence);
 if((!doc.settings.allowAIUserEdits&&!doc.userEditAdmissions?.includes(admission))||inferred||at.index<=previous.at.index||!evidence||evidence.trim().length<3||!prose.includes(evidence))return false;
 const terms=values(value),old=values(fieldValue(doc.state,r));const added=terms.filter(v=>!old.map(normalize).includes(normalize(v)));const changed=added.length?added:old.filter(v=>!terms.map(normalize).includes(normalize(v)));
 const accepted=typeof value==="boolean"?/resolved|completed|fulfilled|done|reopened|pending/i.test(evidence):!!changed.length&&changed.every(v=>normalize(evidence).includes(normalize(v.includes("\u0001")?v.slice(v.indexOf("\u0001")+1):v)));
 if(accepted&&!doc.userEditAdmissions?.includes(admission))(doc.userEditAdmissions??=[]).push(admission);return accepted;
}
export function restorable(doc:Document,r:FieldRef):boolean {const own=doc.state.userVersions?.[fieldKey(r)];return !!own&&JSON.stringify(own.value)!==JSON.stringify(fieldValue(doc.state,r));}
export function restoreEdit(doc:Document,r:FieldRef,useCurrent=false):Partial<ManualEdit>{
 const own=useCurrent?{value:fieldValue(doc.state,r)}:doc.state.userVersions?.[fieldKey(r)];if(!own||own.value===undefined)throw Error("No saved value for this field.");
 const value=own.value;
 if(r.target==="scene"||r.target==="weather")return {target:r.target,field:r.field,value};
 if(r.target==="contact")return {target:"contact",name:r.name,value:{[r.field]:value},editedFields:[r.field]};
 const current=r.target==="location"?doc.state.locations.find(x=>normalize(x.name)===normalize(r.name!)):r.target==="note"?doc.state.notes[r.section as typeof SECTIONS[number]].find(x=>normalize(x.name)===normalize(r.name!)):doc.state.bank.find(x=>normalize(x.name)===normalize(r.name!));
 if(!current)throw Error("This entry is no longer available.");
 const base=r.target==="location"?{description:(current as any).description,relation:(current as any).relation}:r.target==="note"?{detail:(current as any).detail,context:(current as any).context,resolved:(current as any).resolved,sendToAI:(current as any).sendToAI}:{name:current.name,balance:(current as any).balance,...((current as any).time?{time:(current as any).time}:{})};
 return {target:r.target,name:r.target==="bank"?(current as any).id:r.name,...(r.target==="note"?{section:r.section as typeof SECTIONS[number]}:{}),value:{...base,[r.field]:value},editedFields:[r.field]};
}

import type {Document} from "./model";
import {fingerprint,jsonBytes} from "./performance";
import {isRecord} from "./shared";
const KEYS=["settings","edits","fieldLocks","userEditAdmissions","contactMerges","mergeArchive","contactInfo","portraits","rejected","callAdmissions","notices"] as const;
export interface UndoRecord {userId:string;revision:number;history:string;label:string;values:Partial<Record<typeof KEYS[number],unknown>>;missing:string[]}
const LIMIT=256*1024;
/** Only changed manual metadata. No accepted journal, story state, history, or nested undo backup. */
export function makeUndo(before:Document,after:Document,userId:string,history:string,label:string,hash:(v:unknown)=>string=fingerprint):UndoRecord|undefined {
 const record:UndoRecord={userId,revision:after.revision,history,label,values:{},missing:[]};
 for(const key of KEYS)if(hash(before[key])!==hash(after[key])){if(before[key]===undefined)record.missing.push(key);else record.values[key]=before[key];}
 if(!Object.keys(record.values).length&&!record.missing.length)return;
 if(jsonBytes(record,LIMIT)>LIMIT)return;
 return structuredClone(record);
}
export function readUndo(v:unknown):UndoRecord|undefined{
 if(v===undefined)return;if(!isRecord(v)||typeof v.userId!=="string"||!Number.isSafeInteger(v.revision)||typeof v.history!=="string"||v.history.length>65536||typeof v.label!=="string"||v.label.length>100||!isRecord(v.values)||!Array.isArray(v.missing)||v.missing.some(k=>!KEYS.includes(k))||Object.keys(v.values).some(k=>!KEYS.includes(k as any))||jsonBytes(v,LIMIT)>LIMIT)throw Error("Invalid undo record");
 return v as unknown as UndoRecord;
}
export function restoreUndo(doc:Document,record:UndoRecord):void{for(const [key,value]of Object.entries(record.values))(doc as unknown as Record<string,unknown>)[key]=structuredClone(value);for(const key of record.missing)delete (doc as unknown as Record<string,unknown>)[key];delete doc.manualUndo;}
export function changeLabel(change:{edit?:unknown;settings?:unknown;mergeContacts?:unknown;portrait?:unknown;contactInfo?:unknown;fieldControl?:unknown}):string{
 if(change.mergeContacts)return "Contacts merged";
 if(change.edit&&isRecord(change.edit)){const names:Record<string,string>={scene:"Scene",weather:"Weather",contact:"Contact",location:"Location",note:"Note",call:"Call",email:"Email",bank:"Account",transaction:"Transaction"};return `${names[String(change.edit.target)]??"Tracker"} ${change.edit.remove?"deleted":"updated"}`;}
 if(change.portrait||change.contactInfo)return "Contact updated";if(change.fieldControl)return "Field protection updated";if(change.settings)return "Settings saved";return "Tracker updated";
}

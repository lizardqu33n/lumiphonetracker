import {normalize,CONTACT_KEYS,type Contact,type Document} from "./model";
import {isRecord} from "./shared";
export interface ContactInfo {name:string;kind:"Main"|"NPC";locked:boolean;phone:string;email:string;relationship:string;details:{label:string;value:string}[];confirmed?:string[]}
export const emptyContactInfo=(name:string):ContactInfo=>({name,kind:"NPC",locked:false,phone:"",email:"",relationship:"",details:[]});
const text=(v:unknown,max:number)=>typeof v==="string"&&v.length<=max&&!/[<>\u0000\r\n]/.test(v);
export function readContactInfo(value:unknown,name:string):ContactInfo {
 if(!isRecord(value)||!["Main","NPC"].includes(String(value.kind))||typeof value.locked!=="boolean"||!text(value.phone,100)||!text(value.email,150)||!text(value.relationship,100)||!Array.isArray(value.details)||value.details.length>12||value.details.some(d=>!isRecord(d)||!text(d.label,40)||!String(d.label).trim()||!text(d.value,200)))throw Error("Invalid contact details");
 if(value.confirmed!==undefined&&(!Array.isArray(value.confirmed)||value.confirmed.some(k=>!["phone","email","relationship","details"].includes(String(k)))))throw Error("Invalid contact details");
 return {...(Array.isArray(value.confirmed)?{confirmed:value.confirmed as string[]}:{}),name,kind:value.kind as "Main"|"NPC",locked:value.locked,phone:String(value.phone),email:String(value.email),relationship:String(value.relationship),details:value.details.map(d=>({label:String(d.label),value:String(d.value)}))};
}
export const phoneKey=(s:string)=>s.replace(/[ ()\-.]/g,"").trim();
export const addressKey=(s:string)=>s.trim().toLocaleLowerCase("en-US");
export function contactMatch(doc:Pick<Document,"contactInfo"> & Partial<Pick<Document,"edits">>,value:string,mode:"phone"|"email"="phone"):string|undefined {
 const key=mode==="phone"?phoneKey(value):addressKey(value);if(!key)return;
 const matches=Object.values(doc.contactInfo??{}).filter(c=>{const address=c[mode];return !!address&&(mode==="phone"?phoneKey(address):addressKey(address))===key;});
 if(matches.length===1)return matches[0].name;if(matches.length>1)return; // Never choose between duplicate addresses.
 let name=value;for(const e of doc.edits??[])if(e.target==="contact"&&e.rename&&normalize(e.name??"")===normalize(name))name=e.rename;
 return Object.values(doc.contactInfo??{}).find(c=>normalize(c.name)===normalize(name))?.name;
}
export function contactDuplicates(info:Record<string,ContactInfo>):boolean {for(const mode of ["phone","email"] as const){const seen=new Set<string>();for(const c of Object.values(info)){const k=mode==="phone"?phoneKey(c.phone):addressKey(c.email);if(k&&seen.has(k))return true;if(k)seen.add(k);}}return false;}
export function projectContacts(doc:Document,names:string[]=[]):void {
 doc.contactInfo=Object.assign(Object.create(null),doc.contactInfo??{});
 for(const contact of doc.state.contacts){const key=normalize(contact.name),saved=doc.contactInfo?.[key]??emptyContactInfo(contact.name);const exact=names.some(n=>normalize(n)===key);
  const info={...saved,name:contact.name,details:saved.details.map(d=>({...d}))};if(!info.locked&&exact){info.kind="Main";(doc.contactInfo??={})[key]=info;}
  contact.info=info;const first=key.split(" ")[0];const possible=names.filter(n=>normalize(n).split(" ")[0]===first&&normalize(n)!==key);contact.matchHint=!info.locked&&!exact&&possible.length?`First-name-only match: ${possible.join(" / ")}. Check Main or NPC.`:undefined;
 }
}
export function contactContinuity(doc:Document):string {
 if(!doc.settings.apps.Contacts||!CONTACT_KEYS.some(k=>doc.settings.enabled[`contacts.${k}`]))return "";
 return doc.state.contacts.slice(0,30).flatMap(c=>{const i=c.info??doc.contactInfo?.[normalize(c.name)];if(!i)return [];const main=c.player||i.kind==="Main";const parts=[...(doc.settings.apps.Messages&&i.phone&&!main?[`phone=${i.phone}`]:[]),...(doc.settings.apps.Email&&i.email&&!main?[`email=${i.email}`]:[]),...(i.relationship&&!main?[`relationship=${i.relationship}`]:[]),...(!main?i.details.slice(0,3).map(d=>`${d.label}=${d.value.slice(0,80)}`):[])];return parts.length?[`${c.name} (${i.kind}): ${parts.join("; ")}`]:[];}).join("\n").slice(0,2200).replaceAll("{{","{ {").replaceAll("}}","} }");
}

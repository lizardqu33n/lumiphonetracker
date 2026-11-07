import {contactMatches} from "./contact-merge";
import {normalize,type Document} from "./model";
import {emptyContactInfo} from "./contact-info";
import type {SetupData,SetupContact} from "./setup-wizard";
import {isRecord} from "./shared";
export interface SetupDecision {index:number;action:"merge"|"keep";target?:string;name?:string}
export function setupReview(doc:Document,contacts:SetupContact[]):SetupContact[]{
 const seen=doc.state.contacts.map(c=>({name:c.name}));return contacts.map(c=>{const match=contactMatches(c.name,seen);seen.push({name:c.name});return {...c,...(match?{match}:{})};});
}
/** Decisions reference the server's preview indices, never arbitrary field values. */
export function resolveSetup(doc:Document,data:SetupData,decisions:unknown):SetupData {
 if(decisions!==undefined&&(!Array.isArray(decisions)||decisions.length>30))throw Error("Invalid duplicate choices.");
 const choices=(decisions??[]) as unknown[];const used=new Set<number>();for(const d of choices){if(!isRecord(d)||!Number.isInteger(d.index)||Number(d.index)<0||Number(d.index)>=data.contacts.length||used.has(Number(d.index))||!["merge","keep"].includes(String(d.action)))throw Error("Invalid duplicate choices.");used.add(Number(d.index));}
 const names=doc.state.contacts.map(c=>({name:c.name})),contacts:SetupContact[]=[];
 for(const [index,original]of data.contacts.entries()){
  const {match:_match,...c}=original;const match=contactMatches(c.name,names),d=choices.find(d=>isRecord(d)&&d.index===index) as SetupDecision|undefined;
  if(match){if(!d)throw Error("Choose Merge or Keep both for each matching contact.");if(d.action==="merge"){if(!d.target||!match.targets.includes(d.target))throw Error("Choose an existing matching contact to merge into.");c.name=d.target;}else{const name=d.name??c.name;if(typeof name!=="string"||!name.trim()||name.length>100||/[<\r\n]/.test(name)||(names.some(n=>normalize(n.name)===normalize(name))||doc.contactMerges?.[normalize(name)]||Object.values(doc.contactInfo??{}).some(i=>i.aliases?.some(a=>normalize(a)===normalize(name)))))throw Error("Give the separate contact a different full name.");c.name=name.trim();}}
  const prior=contacts.find(p=>normalize(p.name)===normalize(c.name));if(prior){for(const [k,v]of Object.entries(c))if(k!=="name"&&(prior as unknown as Record<string,unknown>)[k]===undefined)Object.assign(prior,{[k]:v});}else{contacts.push(c);if(!names.some(n=>normalize(n.name)===normalize(c.name)))names.push({name:c.name});}
 }
 return {...data,contacts};
}
/** Generated locally after source validation; never ask the model to invent addresses. */
export function withFakeAddresses(doc:Document,data:SetupData,fields:readonly string[]):SetupData {
 if(!doc.settings.fakeAddresses)return data;
 const phones=new Set(Object.values(doc.contactInfo??{}).flatMap(i=>[i.phone,...(i.alternatePhones??[])]).map(s=>s.replace(/[^0-9]/g,""))),emails=new Set(Object.values(doc.contactInfo??{}).flatMap(i=>[i.email,...(i.alternateEmails??[])]).map(s=>s.toLowerCase()));
 for(const c of data.contacts){const match=contactMatches(c.name,doc.state.contacts);const existing=match?.label==="Already exists"?doc.state.contacts.find(x=>normalize(x.name)===normalize(c.name)):undefined;const info=existing?.info??doc.contactInfo?.[normalize(c.name)]??emptyContactInfo(c.name);
  const fake:string[]=[];
  if(fields.includes("contacts.phone")&&!c.phone&&!info.phone&&!info.confirmed?.includes("phone")){for(let n=0;n<100;n++){const phone=`555-01${String(n).padStart(2,"0")}`;if(!phones.has(phone.replace(/[^0-9]/g,""))){c.phone=phone;fake.push("phone");phones.add(phone.replace(/[^0-9]/g,""));break;}}}
  if(fields.includes("contacts.email")&&!c.email&&!info.email&&!info.confirmed?.includes("email")){const stem=normalize(c.name).replace(/[^a-z0-9]+/g,".").replace(/^\.|\.$/g,"")||"contact";for(let n=0;n<100;n++){const email=`${stem}${n?`.${n}`:""}@${doc.settings.fakeDomain}`;if(!emails.has(email)){c.email=email;fake.push("email");emails.add(email);break;}}}
  if(fake.length)c.fakeFields=fake;
 }
 return data;
}

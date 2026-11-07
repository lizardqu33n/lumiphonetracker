import {normalize,type Document,type Contact,type State} from "./model";
import {emptyContactInfo,readContactInfo} from "./contact-info";
import {fieldKey} from "./field-protection";
export function contactMatches(name:string,contacts:Pick<Contact,"name">[]):{label:"Already exists"|"Maybe the same person";targets:string[]}|undefined {
 const key=normalize(name),exact=contacts.filter(c=>normalize(c.name)===key);if(exact.length)return {label:"Already exists",targets:exact.map(c=>c.name)};
 const first=key.split(" ")[0],possible=contacts.filter(c=>normalize(c.name).split(" ")[0]===first);return possible.length?{label:"Maybe the same person",targets:possible.map(c=>c.name)}:undefined;
}
export function canonicalContact(doc:Pick<Document,"contactMerges"> & Partial<Pick<Document,"edits">>,name:string,index=Infinity):string {
 let next=name;const seen=new Set<string>();while(!seen.has(normalize(next))){seen.add(normalize(next));const before=next,m=doc.contactMerges?.[normalize(next)];if(m&&index>m.index)next=m.into;for(const edit of doc.edits??[])if(edit.target==="contact"&&edit.rename&&index>edit.index&&normalize(edit.name??"")===normalize(next))next=edit.rename;if(next===before)break;}return next;
}
/** Run at the merge's history boundary, keeping the chosen card's conflicting values. */
export function projectMerges(doc:Document,index:number):void {
 const state=doc.state;
 for(const m of Object.values(doc.contactMerges??{})){
  if(index<m.index)continue;const source=state.contacts.find(c=>normalize(c.name)===normalize(m.from));if(!source)continue;
  const name=canonicalContact(doc,m.into,index===Infinity?Infinity:index+.1),key=normalize(name);let target=state.contacts.find(c=>normalize(c.name)===key);
  if(!target){target={...source,name};state.contacts.push(target);}else{for(const [f,v]of Object.entries(source.fields))if(!target.fields[f as keyof typeof target.fields])Object.assign(target.fields,{[f]:v});target.player=target.player||source.player;target.editedByUser=target.editedByUser||source.editedByUser;target.addedBySetup=target.addedBySetup||source.addedBySetup;target.lastSeen??=source.lastSeen;}
  if(target.player)for(const f of Object.keys(target.fields))if(!["physical","position","attire"].includes(f))delete target.fields[f as keyof typeof target.fields];
  state.contacts=state.contacts.filter(c=>c!==source);if(Array.isArray(state.scene.present?.value))state.scene.present!.value=[...new Set(state.scene.present!.value.map(n=>normalize(n)===normalize(m.from)?name:n))];
  for(const [id,v]of Object.entries(state.userVersions??{})){const [kind,n,section,f]=JSON.parse(id);if(kind==="contact"&&n===normalize(m.from)){const dest=fieldKey({target:"contact",name,field:f});if(!state.userVersions![dest])state.userVersions![dest]=v;delete state.userVersions![id];}}
 }
}
export function mergeContacts(doc:Document,from:string,into:string,after:string|null,index:number):void {
 const a=doc.state.contacts.find(c=>normalize(c.name)===normalize(from)),b=doc.state.contacts.find(c=>normalize(c.name)===normalize(into));if(!a||!b||a===b)throw Error("Choose two different existing contacts.");
 if((doc.mergeArchive?.length??0)>=100)throw Error("Merge history is full.");
 (doc.mergeArchive??=[]).push({from:structuredClone(a),into:structuredClone(b),sourceInfo:structuredClone(doc.contactInfo?.[normalize(a.name)]??a.info),portrait:doc.portraits?.[normalize(a.name)],after,index});
 const ai=doc.contactInfo?.[normalize(a.name)]??a.info??emptyContactInfo(a.name),bi=doc.contactInfo?.[normalize(b.name)]??b.info??emptyContactInfo(b.name);
 const merged={...bi};for(const f of ["phone","email","relationship"] as const)if(!merged[f]&&!bi.confirmed?.includes(f))merged[f]=ai[f];if(!merged.details.length&&!bi.confirmed?.includes("details"))merged.details=ai.details;
 merged.confirmed=[...new Set([...(bi.confirmed??[]),...(ai.confirmed??[])])];merged.aliases=[...new Set([...(bi.aliases??[]),...(ai.aliases??[]),a.name])];merged.alternatePhones=[...new Set([...(bi.alternatePhones??[]),...(ai.alternatePhones??[]),...(ai.phone&&ai.phone!==merged.phone?[ai.phone]:[])])];merged.alternateEmails=[...new Set([...(bi.alternateEmails??[]),...(ai.alternateEmails??[]),...(ai.email&&ai.email!==merged.email?[ai.email]:[])])];
 merged.fakeFields=["phone","email"].filter(f=>f==="phone"?(merged.phone===bi.phone?bi.fakeFields?.includes(f):ai.fakeFields?.includes(f)):(merged.email===bi.email?bi.fakeFields?.includes(f):ai.fakeFields?.includes(f)));
 (doc.contactInfo??={})[normalize(b.name)]=readContactInfo(merged,b.name);delete doc.contactInfo[normalize(a.name)];
 if(doc.portraits?.[normalize(a.name)]&&!doc.portraits[normalize(b.name)])doc.portraits[normalize(b.name)]=doc.portraits[normalize(a.name)];if(doc.portraits)delete doc.portraits[normalize(a.name)];
 for(const [id,on]of Object.entries(doc.fieldLocks??{})){const [kind,n,,field]=JSON.parse(id);if(kind==="contact"&&n===normalize(a.name)){if(on)(doc.fieldLocks??={})[fieldKey({target:"contact",name:b.name,field})]=true;delete doc.fieldLocks![id];}}
 (doc.contactMerges??={})[normalize(a.name)]={from:a.name,into:b.name,after,index};projectMerges(doc,index);
}

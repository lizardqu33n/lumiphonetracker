import { emptyPatch, normalize, type Patch, type Change, type Value } from "./model";
import type { ParseIssue } from "./schema";

export const WORD_LIMITS = { mood:12, position:12, physical:12, description:19, detail:14, attire:6 } as const;
export const placeholder = (s:string) => /^(?:absent|n\/?a|none|unknown|unspecified|not known|not applicable|not stated|not specified|unavailable|offscreen|off-screen|not present|null|undefined|tbd|[?—-])\.?$/i.test(s.trim());
const words = (s:string) => s.trim().split(/\s+/u).filter(Boolean).length;
function text(s:string, limit=500):string {
  if (!s.trim() || s.length>limit || /[\r\n\u0000<]/u.test(s) || s.includes(" | ") || placeholder(s)) throw new Error("invalid");
  return s.trim();
}
function bounded(s:string,n:number):string { const v=text(s);if(words(v)>n)throw new Error("long");return v; }
function list(s:string,n?:number):string[] {
  if (!s.trim()) return [];
  return s.split("; ").map(v=>n?bounded(v,n):text(v,100));
}
function marked(raw:string):{ value:string;evidence?:string;inferred?:boolean } {
  const chunks=raw.split(" ~ ");const value=chunks.shift()!.trim();let evidence:string|undefined;let inferred=false;
  for(const suffix of chunks) {
    if(suffix==="inferred"&&!inferred){inferred=true;continue;}
    if(evidence!==undefined)throw new Error("suffix");
    const q:unknown=JSON.parse(suffix);if(typeof q!=="string"||q.length<3||q.length>800||/[\r\n<\u0000]/u.test(q)||q.includes(" | "))throw new Error("quote");evidence=q;
  }
  return {value,...(evidence?{evidence}:{}),...(inferred?{inferred:true}:{})};
}
const wrap=(value:unknown,m:{evidence?:string;inferred?:boolean})=>m.evidence||m.inferred?{value,...(m.evidence?{evidence:m.evidence}:{}),...(m.inferred?{inferred:true}:{})}:value;
const aliases:Record<string,string>={loc:"location",c:"contacts",p:"locations",done:"plots"};
const fields:Record<string,string>={roles:"roles",phys:"physical",mood:"mood",pos:"position",thoughts:"thoughts"};
const allowed=["loc","time","date","weather","present","c","p","people","items","rules","plots","done"];

export function parseShorthand(body:string,validate:(value:unknown)=>Patch):{patch:Patch|null;invalidFields:string[];issues:ParseIssue[]} {
  if(body.length>64000)return {patch:null,invalidFields:[],issues:[{line:null,field:"block",reason:"block too large"}]};
  const patch=emptyPatch();const issues:ParseIssue[]=[];const invalid=new Set<string>();
  const groups=new Map<string,{raw:string;key:string;line:number}[]>();
  const rows=body.split("\n").map((raw,i)=>({raw:raw.trim(),line:i+1})).filter(r=>r.raw);
  for(const row of rows) {
    const colon=row.raw.indexOf(":");const key=row.raw.slice(0,colon).trim();const field=aliases[key]??key;
    if(colon<1||!allowed.includes(key)) {issues.push({line:row.line,field:"(unknown)",reason:"unknown or forbidden field"});continue;}
    const raw=row.raw.slice(colon+1).trim();
    const name=raw.split(" | ")[0].split(" ~ ")[0].trim();
    const id=["c","p","people","items","rules","plots","done"].includes(key)?`${field}:${normalize(name)}`:field;
    groups.set(id,[...groups.get(id)??[],{raw,key,line:row.line}]);
  }
  let valid=0;
  for(const [id,group] of groups) {
    const {raw,key,line}=group[0];const field=aliases[key]??key;
    if(group.length>1) {invalid.add(id);for(const r of group)issues.push({line:r.line,field,reason:"duplicate or conflicting record"});continue;}
    try {
      if(raw.endsWith(" |"))throw new Error("empty trailing field");
      let data:Record<string,unknown>={};
      if(["time","date","weather","present","loc"].includes(key)) {
        const m=marked(raw);if(m.inferred)throw new Error("inference");
        const parts=m.value.split(" | ");
        if(key==="loc") {if(parts.length>2)throw new Error("parts");data.location=wrap({name:text(parts[0],100),wider:parts[1]===undefined?[]:list(parts[1])},m);}
        else {if(parts.length>1)throw new Error("parts");data[field]=wrap(key==="present"?list(m.value):text(m.value),m);}
      } else if(key==="c") {
        const parts=raw.split(" | ");const c:Record<string,unknown>={name:text(parts.shift()!,100)};
        if(!parts.length)throw new Error("empty contact");const seen=new Set<string>();const attire:Record<string,ReturnType<typeof marked>>={};
        for(const part of parts) {
          const eq=part.indexOf("=");const k=part.slice(0,eq).trim();
          if(eq<1||seen.has(k)||![...Object.keys(fields),"worn","off"].includes(k))throw new Error("field");seen.add(k);
          const m=marked(part.slice(eq+1));
          if(k==="worn"||k==="off") {attire[k]=m;continue;}
          const f=fields[k];const value=f==="roles"?list(m.value):["physical","position","mood"].includes(f)?bounded(m.value,12):text(m.value);
          c[f]=wrap(value,m);
        }
        if(attire.worn||attire.off) {
          if(!attire.worn||!attire.off)throw new Error("partial attire");
          const worn=list(attire.worn.value,6),removed=list(attire.off.value,6);if(!worn.length&&!removed.length)throw new Error("empty attire");
          const quotes=[attire.worn.evidence,attire.off.evidence].filter(Boolean);if(new Set(quotes).size>1)throw new Error("quotes");
          c.attire=wrap({worn,removed},{evidence:quotes[0],inferred:attire.worn.inferred||attire.off.inferred});
        }
        data.contacts=[c];
      } else {
        const m=marked(raw);if(m.inferred)throw new Error("inference");const parts=m.value.split(" | ");
        if(parts.length>3)throw new Error("parts");const name=text(parts[0],100);
        if(key==="done") {if(parts.length!==1)throw new Error("parts");data.plots=[{name,resolved:true,...(m.evidence?{evidence:m.evidence}:{})}];}
        else if(key==="p") data.locations=[{name,...(parts[1]!==undefined?{description:bounded(parts[1],19)}:{}),...(parts[2]!==undefined?{relation:text(parts[2])}:{}),...(m.evidence?{evidence:m.evidence}:{})}];
        else data[key]=[{name,...(parts[1]!==undefined?{detail:bounded(parts[1],14)}:{}),...(parts[2]!==undefined?{context:text(parts[2],240)}:{}),...(m.evidence?{evidence:m.evidence}:{})}];
      }
      const p=validate(data);Object.assign(patch.scene,p.scene);if(p.weather)patch.weather=p.weather;
      patch.contacts.push(...p.contacts);patch.locations.push(...p.locations);
      for(const [section,notes] of Object.entries(p.notes)) (patch.notes[section as keyof Patch["notes"]]??=[]).push(...notes!);
      valid++;
    } catch {invalid.add(id);issues.push({line,field,reason:"invalid shorthand value or structure"});}
  }
  return {patch:valid||!rows.length?patch:null,invalidFields:[...invalid],issues};
}

/** Journal representation stays compatible with existing saved documents. */
export function patchValues(patch:Patch):Record<string,unknown> {
  const cell=(c:Change|undefined):unknown=>c?wrap(c.value,c):undefined;
  return {...Object.fromEntries(Object.entries(patch.scene).filter(([,v])=>v).map(([k,v])=>[k,cell(v)])),...(patch.weather?{weather:cell(patch.weather)}:{}),
    ...(patch.contacts.length?{contacts:patch.contacts.map(c=>({name:c.name,...Object.fromEntries(Object.entries(c.fields).filter(([,v])=>v).map(([k,v])=>[k,cell(v)]))}))}:{}),
    ...(patch.locations.length?{locations:patch.locations}:{}),...patch.notes};
}
/** Legacy values remain readable; placeholders never replace confirmed AI facts. */
export function usable(value:Value):boolean {
  if(typeof value==="string")return !!value.trim()&&!placeholder(value);
  if(Array.isArray(value))return value.every(v=>!!v.trim()&&!placeholder(v));
  if("name" in value)return !!value.name.trim()&&!placeholder(value.name)&&value.wider.every(v=>!placeholder(v));
  return !!(value.worn.length+value.removed.length)&&[...value.worn,...value.removed].every(v=>!!v.trim()&&!placeholder(v));
}
export function usablePatch(p:Patch):boolean {
  const valid=(v:string|undefined)=>v===undefined||!v.trim()||!placeholder(v);
  return Object.values(p.scene).every(c=>!c||usable(c.value))&&(!p.weather||usable(p.weather.value))&&
    p.contacts.every(c=>valid(c.name)&&Object.values(c.fields).every(v=>!v||usable(v.value)))&&
    p.locations.every(p=>valid(p.name)&&valid(p.description)&&valid(p.relation))&&
    Object.values(p.notes).every(notes=>notes!.every(n=>valid(n.name)&&valid(n.detail)&&valid(n.context)));
}

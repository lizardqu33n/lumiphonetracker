import {createHash} from "node:crypto";

/** Framed SHA-256 over exact JS strings/values. Never constructs a whole-history JSON proof. */
export function fingerprint(value:unknown,json=false):string {
 const h=createHash("sha256");
 const text=(s:string)=>{h.update(String(s.length)+":");for(let i=0;i<s.length;i+=8192)h.update(s.slice(i,i+8192),"utf16le");};
 const visit=(v:unknown):void=>{
  if(v===null){h.update("null;");return;}
  if(typeof v==="string"){h.update("s");text(v);return;}
  if(Array.isArray(v)){h.update("a"+v.length+":");for(const x of v)visit(json&&x===undefined?null:x);return;}
  if(typeof v==="object"){const o=v as Record<string,unknown>,keys=Object.keys(o).filter(k=>!json||o[k]!==undefined).sort();h.update("o"+keys.length+":");for(const k of keys){text(k);visit(o[k]);}return;}
  h.update(typeof v+":"+String(v)+";");
 };visit(value);return h.digest("hex");
}
/** Exact JSON UTF-8 bytes for plain data; a cap stops traversal without serializing/copying blobs. */
export function jsonBytes(value:unknown,cap=Infinity):number {
 let n=0;
 const str=(s:string)=>{n+=2;for(let i=0;i<s.length&&n<=cap;i++){const c=s.charCodeAt(i);if(c===34||c===92)n+=2;else if(c<32)n+=[8,9,10,12,13].includes(c)?2:6;else if(c<128)n++;else if(c<2048)n+=2;else if(c>=0xd800&&c<=0xdbff&&s.charCodeAt(i+1)>=0xdc00&&s.charCodeAt(i+1)<=0xdfff){n+=4;i++;}else n+=c>=0xd800&&c<=0xdfff?6:3;}};
 const visit=(v:unknown):void=>{if(n>cap)return;if(typeof v==="string")str(v);else if(Array.isArray(v)){n+=2;for(let i=0;i<v.length&&n<=cap;i++){if(i)n++;visit(v[i]===undefined?null:v[i]);}}else if(v&&typeof v==="object"){n+=2;let first=true;for(const k of Object.keys(v)){const x=(v as Record<string,unknown>)[k];if(x===undefined)continue;if(!first)n++;first=false;str(k);n++;visit(x);if(n>cap)break;}}else n+=JSON.stringify(v)?.length??4;};visit(value);return n;
}
export interface PerformanceSample {operation:string;durationMs:number;historyMessages:number;historyBytes:number;rebuildCount:number;pendingRefreshes:number;snapshotBytes:number;cacheHit?:boolean;failed?:boolean}
/** Only allowlisted numeric/boolean counters and internal operation labels leave the worker. */
export function performanceLine(s:PerformanceSample):string {
 const count=(n:number)=>Number.isFinite(n)?Math.max(0,Math.round(n)):0;
 return `Lumi Phone Tracker: performance ${JSON.stringify({operation:["refresh","build","settings","snapshot","mutation"].includes(s.operation)?s.operation:"refresh",durationMs:count(s.durationMs),historyMessages:count(s.historyMessages),historyBytes:count(s.historyBytes),rebuildCount:count(s.rebuildCount),pendingRefreshes:count(s.pendingRefreshes),snapshotBytes:count(s.snapshotBytes),cacheHit:s.cacheHit===true,failed:s.failed===true})}`;
}

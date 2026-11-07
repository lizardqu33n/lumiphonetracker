import { ModelCallError, safeModelMessage } from "./model-errors";
export const HELPER_FAILURES = ["permission missing","no connection","provider error","timeout","empty reply","invalid output","validation rejected", "invalid JSON", "stopped"] as const;
export type HelperFailureCategory = typeof HELPER_FAILURES[number];
export interface RefreshResult { ok:boolean; category?:HelperFailureCategory; message?:string }
export class HelperFailure extends Error {
  constructor(readonly category:HelperFailureCategory) { super(category);this.name="HelperFailure"; }
}
export const failureLabel=(category:HelperFailureCategory)=>category[0].toUpperCase()+category.slice(1);
export const helperNoticeText=(category:HelperFailureCategory)=>
  (category==="no connection"?"Connection not found. ":"")+`Tracker update failed: ${failureLabel(category)}`;
export const isHelperNotice=(text:string)=>text==="Connection not found"||text.startsWith("Connection not found. ")||text.startsWith("Tracker update failed");
export function failureCategory(error:unknown,fallback:HelperFailureCategory="provider error"):HelperFailureCategory {
  if(error instanceof HelperFailure||error instanceof ModelCallError)return error.category;
  // Inspect only to classify; never forward provider/host exception details.
  const e=error as {name?:unknown;message?:unknown;code?:unknown}|null;
  const message=[e?.message,e?.code].filter(v=>typeof v==="string").join(" ");
  if(/permission|userId is required|chat unavailable|allow chat access|unauthori[sz]ed|forbidden/i.test(message))return "permission missing";
  if(e?.name==="TimeoutError"||e?.name==="AbortError"||/timed? ?out|timeout/i.test(message))return "timeout";
  return fallback;
}
export function readRefreshResult(value:unknown):RefreshResult {
  if(value&&typeof value==="object"&&"ok" in value) {
    const r=value as RefreshResult;
    if(r.ok===true)return {ok:true};
    if(r.ok===false&&HELPER_FAILURES.includes(r.category as HelperFailureCategory))return {ok:false,category:r.category,...(typeof r.message==="string"&&safeModelMessage(r.message)?{message:safeModelMessage(r.message)}:{})};
  }
  return {ok:false,category:"invalid output"};
}

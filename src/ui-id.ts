/** Documented frontend-uuid-v1 helper; the pinned older DTO omits this member. */
export interface UiUuidContext {host?:{capabilities?:Record<string,number>};uuid?:{v4():string}}
let fallbackSession=0;
export function createUiIds(ctx:UiUuidContext):()=>string {
 if((ctx.host?.capabilities?.["frontend-uuid-v1"]??0)>=1&&typeof ctx.uuid?.v4==="function")return ()=>ctx.uuid!.v4();
 // Older-host compatibility for request/DOM identifiers only, never auth tokens.
 const prefix="lpt-"+Date.now().toString(36)+"-"+(++fallbackSession).toString(36);let sequence=0;
 return ()=>prefix+"-"+(++sequence).toString(36);
}

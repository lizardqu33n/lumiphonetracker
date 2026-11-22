import type {LlmMessageDTO} from "lumiverse-spindle-types";
import type {Document} from "./model";
import {promptHasPhoneTags,promptNeedsTextAdmission,trimPhoneHistory} from "./retention";
interface PromptContext {chatId?:string;userId?:string;signal?:AbortSignal;interceptorDeadlineAt?:number}
interface PromptIO {settings(chat:string,user:string,signal:AbortSignal):Promise<Document>;preview(chat:string,user:string,signal:AbortSignal):Promise<Document>;warn(text:string):void}
/** No retries or queued duplicate interceptor jobs. Host reads themselves have no cancellation option. */
export function createPhoneInterceptor(io:PromptIO,budgetMs=1500){
 const warn=(text:string)=>{try{io.warn(text);}catch{}};
 const inFlight=new Map<string,Promise<LlmMessageDTO[]>>();
 return async(messages:LlmMessageDTO[],context:PromptContext):Promise<LlmMessageDTO[]>=>{try{
  if(typeof context?.chatId!=="string"||!context.chatId||context.chatId.length>256||typeof context.userId!=="string"||!context.userId.trim()){warn("Lumi Phone Tracker: prompt context unavailable; prompt unchanged.");return messages;}
  if(context.signal?.aborted||!promptHasPhoneTags(messages))return messages;
  const key=JSON.stringify([context.userId,context.chatId]);
  if(inFlight.has(key)||inFlight.size>=4){warn("Lumi Phone Tracker: prompt cleanup busy; prompt unchanged.");return messages;}
  const remaining=context.interceptorDeadlineAt===undefined?budgetMs:Math.min(budgetMs,context.interceptorDeadlineAt-Date.now()-100);
  if(remaining<=0)return messages;
  const deadline=Date.now()+remaining;
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
  const abort=()=>controller.abort();context.signal?.addEventListener("abort",abort,{once:true});
  const stopped=new Promise<LlmMessageDTO[]>(resolve=>{controller.signal.addEventListener("abort",()=>resolve(messages),{once:true});timer=setTimeout(()=>{warn("Lumi Phone Tracker: prompt cleanup budget exceeded; prompt unchanged.");controller.abort();},remaining);});
  const check=()=>{controller.signal.throwIfAborted();if(Date.now()>=deadline){warn("Lumi Phone Tracker: prompt cleanup budget exceeded; prompt unchanged.");controller.abort();controller.signal.throwIfAborted();}};
  const task=(async()=>{try{
   check();const doc=await io.settings(context.chatId!,context.userId!,controller.signal);check();
   if(doc.trackingEnabled===false)return messages;
   const admitted=promptNeedsTextAdmission(messages,doc.settings)?await io.preview(context.chatId!,context.userId!,controller.signal):doc;
   check();return trimPhoneHistory(messages,admitted.settings,admitted,check);
  }catch{if(!controller.signal.aborted)warn("Lumi Phone Tracker: prompt processing failed; prompt unchanged.");return messages;}})();
  inFlight.set(key,task);
  // Keep the slot until actual host work settles, even after returning on timeout.
  void task.finally(()=>{if(inFlight.get(key)===task)inFlight.delete(key);});
  try{return await Promise.race([task,stopped]);}finally{clearTimeout(timer);context.signal?.removeEventListener("abort",abort);}
 }catch{warn("Lumi Phone Tracker: prompt processing failed; prompt unchanged.");return messages;}
 };
}

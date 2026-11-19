
import {PhoneStore} from "../src/phone-store";
import {emptyDocument} from "../src/model";
import {replay,type StoryRow} from "../src/engine";
import {registerPhoneMacros,MACRO_NAMES} from "../src/phone-macros";
import {trimPhoneHistory} from "../src/retention";
const output=[];
for(const count of [100,500,1000]){
 const rows:StoryRow[]=Array.from({length:count},(_,i)=>({id:"m"+i,chat_id:"a",index_in_chat:i,swipe_id:0,role:i%2?"assistant":"user",content:"A fictional traveler waits beside the station. ".repeat(16)+(i%2?"<phone-state>time: Evening</phone-state>":"")}));
 let saved=JSON.stringify(replay(emptyDocument("a"),rows,["Player"])),reads=0;
 const store=new PhoneStore({authorize:async(c,u)=>c==="a"&&u==="owner",read:async()=>saved,write:async(_,value)=>{saved=value;},history:async()=>{reads++;return structuredClone(rows);},player:async()=>"Player"});
 const handlers=new Map<string,(context:any)=>Promise<string>>();
 const replayObjects=new Set<object>();
 const load=async()=>{const doc=await store.preview("a","owner");const cached=(store as any).replayCache?.doc;if(cached)replayObjects.add(cached);return doc;};
 registerPhoneMacros({registerMacro:(d:any)=>handlers.set(d.name,d.handler),permissions:{has:()=>true},log:{warn:()=>{}}} as any,()=>load());
 const context={userId:"owner",chatId:"a"};
 for(const kind of ["no_macros","phone_format","full_parallel","full_serial","interceptor_only"]){
  reads=0;replayObjects.clear();(store as any).replayCache=undefined;const start=performance.now();
  if(kind==="phone_format")await handlers.get("phone_format")!(context);
  if(kind==="full_parallel")await Promise.all(MACRO_NAMES.map(name=>handlers.get(name)!(context)));
  if(kind==="full_serial")for(const name of MACRO_NAMES)await handlers.get(name)!(context);
  if(kind==="interceptor_only"){const doc=await load();trimPhoneHistory(rows.map(r=>({role:r.role,content:r.content,__isChatHistory:true,sourceMessageId:r.id,sourceIndexInChat:r.index_in_chat})),doc.settings,doc);}
  output.push({count,kind,reads,replaySnapshots:replayObjects.size,ms:performance.now()-start});
 }
}
console.log(JSON.stringify(output));

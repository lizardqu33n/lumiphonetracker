import {PhoneStore} from "../src/phone-store";
import {emptyDocument} from "../src/model";
import type {StoryRow} from "../src/engine";
let raw=JSON.stringify(emptyDocument("a")),historyReads=0;
const rows:StoryRow[]=Array.from({length:1000},(_,i)=>({id:"m"+i,chat_id:"a",index_in_chat:i,role:i%2?"assistant":"user",name:i%2?"Ada":"Player",content:"A fictional traveler waits beside the station. ".repeat(16)+(i%2?"<phone-state>time: Evening</phone-state>":""),swipe_id:0}));
const store=new PhoneStore({authorize:async(c,u)=>c==="a"&&u==="u",read:async()=>raw,write:async(_c,v)=>{raw=v},history:async()=>{historyReads++;return structuredClone(rows)},player:async()=>"Player"});
await store.openView("a","u");const bootstrap=historyReads,start=performance.now();
for(let i=0;i<20;i++){const r:StoryRow={id:"new"+i,chat_id:"a",index_in_chat:rows.length,role:"assistant",content:`They wait.<phone-state>time: Evening ${i}</phone-state>`,swipe_id:0};rows.push(r);await store.receiveSaved("u","a",r);}
const appendMs=performance.now()-start,appendReads=historyReads-bootstrap;
for(let i=0;i<20;i++){await store.savedView("a","u");await store.promptPreview("a","u",new AbortController().signal);}
console.log(JSON.stringify({initialMessages:1000,bootstrapHistoryReads:bootstrap,newReplies:20,appendHistoryReads:appendReads,cachedReadHistoryReads:historyReads-bootstrap-appendReads,appendElapsedMs:appendMs,savedBytes:Buffer.byteLength(raw)}));

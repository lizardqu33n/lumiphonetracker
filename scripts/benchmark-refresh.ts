import {PhoneStore} from "../src/phone-store";
import {emptyDocument} from "../src/model";
import {replay,type StoryRow} from "../src/engine";
import {phoneSnapshot} from "../src/ui-snapshot";
// Synthetic only: counts and byte sizes, never user chat contents.
const rows:StoryRow[]=Array.from({length:1000},(_,i)=>({id:"m"+i,chat_id:"a",index_in_chat:i,swipe_id:0,role:i%2?"assistant":"user",content:"A fictional traveler waits at the station. ".repeat(16)+(i%2?"<phone-state>time: Evening</phone-state>":"")}));
const doc=replay(emptyDocument("a"),rows,["Player"]);let saved=JSON.stringify(doc),reads=0;
let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>release=r),started=new Promise<void>(r=>entered=r);
const store=new PhoneStore({authorize:async(c,u)=>c==="a"&&u==="owner",read:async()=>saved,write:async(_,v)=>{saved=v},history:async()=>{reads++;if(reads===1){entered();await gate;}return structuredClone(rows)},player:async()=>"Player"});
const start=performance.now();const work=[store.sync("owner","a")];await started;for(let i=0;i<20;i++){work.push(i%2?store.preview("a","owner"):store.sync("owner","a"));await Promise.resolve();}release();await Promise.all(work);
console.log(JSON.stringify({messages:rows.length,requests:work.length,historyReads:reads,fullDocumentBytes:Buffer.byteLength(JSON.stringify(doc)),uiSnapshotBytes:Buffer.byteLength(JSON.stringify(phoneSnapshot(doc))),elapsedMs:performance.now()-start}));

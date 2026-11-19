
import {replay,type StoryRow} from "../src/engine";
import {emptyDocument} from "../src/model";
import {PhoneStore} from "../src/phone-store";
import {HelperAI} from "../src/helper";
import {transformTags} from "../src/tags";
const measure=(work:()=>unknown)=>{
  const times:number[]=[];let result:any;
  for(let i=0;i<3;i++){const start=performance.now();result=work();times.push(performance.now()-start);}
  return {ms:times.sort((a,b)=>a-b)[1],result};
};
const output:any={replay:[],hooks:[],tags:[]};
for(const count of [100,500,1000]){
  const prose="A fictional traveler waits beside the station. ".repeat(16);
  const rows:StoryRow[]=Array.from({length:count},(_,i)=>({id:"m"+i,chat_id:"a",index_in_chat:i,swipe_id:0,role:i%2?"assistant":"user",content:prose+(i%2?"<phone-state>time: Evening</phone-state>":"")}));
  const doc=replay(emptyDocument("a"),rows,["Player"]);
  Bun.gc(true);const startMemory=process.memoryUsage();
  const timed=measure(()=>replay(doc,rows,["Player"]));
  const transient=process.memoryUsage();Bun.gc(true);const retained=process.memoryUsage();
  output.replay.push({count,historyBytes:Buffer.byteLength(JSON.stringify(rows)),documentBytes:Buffer.byteLength(JSON.stringify(doc)),acceptedBytes:Buffer.byteLength(JSON.stringify(doc.accepted)),legacyBytes:Buffer.byteLength(JSON.stringify(doc.legacy??null)),helperEntryBytes:Buffer.byteLength(JSON.stringify(doc.helperEntries)),medianMs:timed.ms,transientHeapDelta:transient.heapUsed-startMemory.heapUsed,retainedHeapDelta:retained.heapUsed-startMemory.heapUsed,rss:retained.rss,hash:new Bun.CryptoHasher("sha256").update(JSON.stringify(timed.result)).digest("hex")});
  let reads=0,bytes=0;const historyBytes=Buffer.byteLength(JSON.stringify(rows));let saved=JSON.stringify(doc);
  const store=new PhoneStore({authorize:async(c,u)=>c==="a"&&u==="owner",read:async()=>saved,write:async(_,value)=>{saved=value;},history:async()=>{reads++;bytes+=historyBytes;return structuredClone(rows);},player:async()=>"Player"});
  const helper=new HelperAI(store,{allowed:()=>true,connections:async()=>[],generate:async()=>{throw Error("Unexpected model call");},changed:()=>{},warn:()=>{}});
  let start=performance.now();
  for(let i=0;i<20;i++)helper.ended("owner",{chatId:"a",generationId:"g"+i,messageId:rows.at(-1)!.id,content:rows.at(-1)!.content});
  await helper.settled("a");
  output.hooks.push({count,work:"20 Main AI completion hooks",reads,returnedBytes:bytes,ms:performance.now()-start});
  reads=bytes=0;start=performance.now();
  await Promise.all(Array.from({length:100},()=>store.sync("owner","a")));
  output.hooks.push({count,work:"100 concurrent sync requests",reads,returnedBytes:bytes,ms:performance.now()-start});
}
for(const length of [100000,1000000,5000000]){
  for(const [kind,unit]of [["ordinary","An ordinary fictional paragraph. "],["many_tags",'<phone-text from="Ada">Hi</phone-text>'],["incomplete",'<unrelated> <phone-text from="Ada" ']]){
    const input=unit.repeat(Math.ceil(length/unit.length)).slice(0,length);
    const result=measure(()=>transformTags(input,"display"));
    const bypass=measure(()=>input);
    output.tags.push({kind,characters:input.length,processorMs:result.ms,bypassMs:bypass.ms,outputCharacters:result.result.length});
  }
}
console.log(JSON.stringify(output));

import {test,expect} from "bun:test";
import {emptyDocument,emptyPatch,type CallData} from "../src/model";
import {replay,helperSourceSignature,type StoryRow} from "../src/engine";
import {parseExpanded} from "../src/schema";
import {validateActivity,activityReceipt,activityUnread} from "../src/activity";
import {helperValues,helperInput,HelperAI} from "../src/helper";
import {PhoneStore,readDocument} from "../src/phone-store";
import {formatMacro,renderMacro} from "../src/phone-macros";
const row=(i:number,content:string):StoryRow=>({id:`m${i}`,chat_id:"c",index_in_chat:i,role:"assistant",swipe_id:0,content});
const block=(s:string)=>`<phone-state>\n${s}\n</phone-state>`;
const call="call: Ada | missed | 3 PM";
const ready=(rows:StoryRow[],d=emptyDocument("c"))=>replay(d,rows,["Player"]);
test("source identity keeps identical calls from different messages, but never duplicates replays or selected swipes",()=>{
 const rows=[row(0,block(call)),row(1,block(call))];let d=ready(rows);expect(d.state.calls.length).toBe(2);expect(new Set(d.state.calls.map(c=>c.id)).size).toBe(2);
 for(let i=0;i<3;i++)d=ready(rows,readDocument(JSON.stringify(d),"c"));expect(d.state.calls.length).toBe(2);
 const ids=d.state.calls.map(c=>c.id);d=ready([{...rows[0],swipe_id:1},rows[1]],d);expect(d.state.calls.map(c=>c.id)).toEqual(ids);
 d=ready([row(0,block("call: Bea | in")),rows[1]],d);expect(d.state.calls.map(c=>c.name)).toEqual(["Bea","Ada"]);
 d=ready([row(0,"Regenerated with no calls"),rows[1]],d);expect(d.state.calls.map(c=>c.name)).toEqual(["Ada"]);
});
test("repeat count validates independently, defaults to one, and survives legacy JSON",()=>{
 expect(parseExpanded(call)?.calls?.[0].count??1).toBe(1);
 expect(parseExpanded(call+" | x3")?.calls?.[0].count).toBe(3);
 expect(parseExpanded("call: Ada | missed | x20")?.calls?.[0].count).toBe(20);
 expect(parseExpanded('calls=[{"name":"Ada","direction":"missed","count":3}]')?.calls?.[0].count).toBe(3);
 for(const count of ["x0","x21","x-1","x1.5","x01","xnone","xN/A","3","", "x3 extra"]){const patch=parseExpanded(call+" | "+count+"\nweather: Rain");expect(patch?.calls??[]).toEqual([]);expect(patch?.weather?.value).toBe("Rain");}
 for(const count of [0,21,-1,1.5,"3",null])expect(()=>validateActivity("calls",{name:"Ada",direction:"missed",count})).toThrow();
});
test("one x3 record has one receipt; continuity includes count only for added Calls",()=>{
 const d=ready([row(0,block(call+" | x3"))]);const c=d.state.calls[0];expect(d.state.calls.length).toBe(1);expect(activityUnread(c,{[c.id]:activityReceipt(c)})).toBe(false);
 expect(formatMacro(d)).not.toContain("x1–x20");d.settings.apps.Calls=true;expect(formatMacro(d)).toContain("x1–x20");expect(formatMacro(d)).toContain("NEW calls");expect(renderMacro("phone_calls",d)).toContain("x3");
});
test("Helper call verifies actual source+quote and stays there on repeat helper runs",()=>{
 const rows=[row(0,"Ada has three missed calls at 3 PM."),row(1,"The door opens.")];const d=emptyDocument("c");d.settings.apps.Calls=true;
 const values=helperValues(call+' | x3 ~ '+JSON.stringify({source:"m0",quote:rows[0].content}),d,rows);
 const payload=JSON.parse(helperInput({doc:d,recent:rows,history:""}).messages[1].content as string);expect(payload.recent_messages[0].id).toBe("m0");
 const at={id:"m1",index:1,variant:"[0,null]"};d.helperEntries=[{id:"h1",at,sources:rows.map(r=>({id:r.id,signature:helperSourceSignature(r)})),values,prose:rows.map(r=>r.content).join("\n")}];
 let built=ready(rows,d);expect(built.state.calls.length).toBe(1);expect(built.state.calls[0].at.id).toBe("m0");expect(built.state.calls[0].count).toBe(3);
 built.helperEntries.push({...d.helperEntries[0],id:"h2"});built=ready(rows,built);expect(built.state.calls.length).toBe(1);
 const invalid=[{source:"m1",quote:rows[0].content},{source:"missing",quote:rows[0].content},{source:"m0",quote:"Invented quote"}];
 for(const proof of invalid)expect(()=>helperValues(call+' | x3 ~ '+JSON.stringify(proof),d,rows)).toThrow();
 expect(()=>helperValues(call,d,rows)).toThrow();
 expect(()=>helperValues(call+' | x4 ~ '+JSON.stringify({source:"m0",quote:rows[0].content}),d,rows)).toThrow();
 const changed=ready([row(0,"Ada never called."),rows[1]],built);expect(changed.state.calls).toEqual([]);
});
test("Helper cannot invent outgoing player calls from unrelated user messages",()=>{
 const r={...row(0,"Ada called Player."),role:"user" as const,name:"Player"};const d=emptyDocument("c");d.settings.apps.Calls=true;
 const values=helperValues('call: Ada | out ~ '+JSON.stringify({source:r.id,quote:r.content}),d,[r]);d.helperEntries=[{id:"h",at:{id:r.id,index:0,variant:"[0,null]"},sources:[{id:r.id,signature:helperSourceSignature(r)}],values,prose:r.content}];expect(ready([r],d).state.calls).toEqual([]);
});
test("editing count stays protected on reread, deleting one source never suppresses a later repeat",()=>{
 const rows=[row(0,block(call)),row(1,block(call))];let d=ready(rows);const id=d.state.calls[0].id;
 d.edits.push({id:"edit",after:"m1",index:1,target:"call",name:id,value:{name:"Ada",direction:"missed",time:"3 PM",count:3}});d=ready(rows,d);expect(d.state.calls.map(c=>c.count??1)).toEqual([3,1]);
 d=ready(rows,readDocument(JSON.stringify(d),"c"));expect(d.state.calls.map(c=>c.count??1)).toEqual([3,1]);
 d.edits.push({id:"delete",after:"m1",index:1,target:"call",name:id,remove:true});d=ready(rows,d);expect(d.state.calls.length).toBe(1);
 d=ready([...rows,row(2,block(call))],d);expect(d.state.calls.length).toBe(2);
 d=ready([row(0,block("call: Bea | in")),rows[1]],d);expect(d.state.calls.map(c=>c.name)).toEqual(["Bea","Ada"]);
});
test("legacy IDs, read receipts, edits and admitted cap slots survive migration",()=>{
 const rows=Array.from({length:31},(_,i)=>row(i,block(call)));
 const unique=Array.from({length:30},(_,i)=>row(i+31,block(`call: Person ${i} | missed`)));
 let d=ready(unique);
 // Build a genuine legacy snapshot from current validated source journal, with old physical IDs.
 d.accepted.unshift({at:{id:"m0",index:0,variant:"[0,null]"},patch:{...emptyPatch(),calls:[{name:"Ada",direction:"missed",time:"3 PM"}]},texts:[],prose:"",role:"assistant"});
 d.state.calls.forEach((c,i)=>{c.id=JSON.stringify([unique[i].id,"[0,null]","calls",0]);delete c.legacyIds;});
 const old=d.state.calls[0],seen={[old.id]:JSON.stringify(old)};const legacyId=old.id;
 d.edits.push({id:"e",after:unique.at(-1)!.id,index:60,target:"call",name:legacyId,value:{name:old.name,direction:"missed",count:3}});
 d=ready([...rows,...unique],readDocument(JSON.stringify(d),"c"));expect(d.state.calls.length).toBe(30);expect(d.state.calls.every(c=>c.name.startsWith("Person"))).toBe(true);expect(d.state.calls.find(c=>c.name==="Person 0")?.count).toBe(3);expect(d.edits[0].name).not.toBe(legacyId);
 // Count correction intentionally changes the receipt; unchanged legacy records remain read.
 const second=d.state.calls.find(c=>c.name==="Person 1")!;const oldSecond={...second,id:JSON.stringify([unique[1].id,"[0,null]","calls",0])};delete oldSecond.legacyIds;
 expect(activityUnread(second,{[oldSecond.id]:JSON.stringify(oldSecond)})).toBe(false);expect(activityUnread(d.state.calls.find(c=>c.name==="Person 0")!,seen)).toBe(true);
});

test("a real Helper runner journals the establishing message and repeated refreshes do not duplicate its call",async()=>{
 const rows=[row(0,"Ada has three missed calls at 3 PM."),row(1,"The group sits."),row(2,"The group waits.")];let disk="";
 const store=new PhoneStore({authorize:async(c,u)=>c==="c"&&u==="trusted",read:async()=>disk,write:async(c,v)=>{disk=v;},history:async()=>rows,player:async()=>"Player"});
 let d=await store.sync("trusted","c");d=await store.update("trusted","c",d.revision,{settings:{source:"helper",connection_id:"small",apps:{Calls:true}}});let requests=0;
 const helper=new HelperAI(store,{allowed:()=>true,connections:async u=>{expect(u).toBe("trusted");return [{id:"small",name:"Small",model:"Small"}];},generate:async input=>{requests++;expect(input.userId).toBe("trusted");return {content:call+' | x3 ~ '+JSON.stringify({source:"m0",quote:rows[0].content}),finish_reason:"stop"};},changed:()=>{},warn:()=>{}});
 await helper.refresh("trusted","c");await helper.refresh("trusted","c");d=await store.sync("trusted","c");expect(requests).toBe(2);expect(d.state.calls.length).toBe(1);expect(d.state.calls[0].at.id).toBe("m0");expect(d.state.calls[0].count).toBe(3);
});

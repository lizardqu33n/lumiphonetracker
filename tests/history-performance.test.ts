
import {test,expect} from "bun:test";
import {PhoneStore,readDocument} from "../src/phone-store";
import {emptyDocument} from "../src/model";
import {replay,type StoryRow} from "../src/engine";
import {readStoryHistory} from "../src/history";
import {scanTags,transformTags} from "../src/tags";
const row=(content:string,swipe=0):StoryRow=>({id:"m",chat_id:"a",index_in_chat:0,role:"assistant",content,swipe_id:swipe});
function fixture(){
 let rows=[row("The scene is at Gate.<phone-state>loc: Gate</phone-state>")];
 let raw="";let player="Player";let names=["Ada"];
 const store=new PhoneStore({authorize:async(c,u)=>c==="a"&&["u","v"].includes(u),read:async()=>raw,write:async(_,value)=>{raw=value;},history:async()=>structuredClone(rows),player:async(_c,u)=>u==="v"?"Other player":player,names:async()=>names as any});
 return {store,rows:()=>rows,setRows:(value:StoryRow[])=>{rows=value;},setRaw:(value:string)=>{raw=value;},setPlayer:(value:string)=>{player=value;},setNames:(value:any[])=>{names=value;}};
}
test("replay memoization validates history, persona, settings and card names on every call",async()=>{
 const f=fixture();await f.store.preview("a","u");const first=(f.store as any).replayCache.doc;
 const again=await f.store.preview("a","u");expect((f.store as any).replayCache.doc).toBe(first);
 again.settings.logLines=99;expect((await f.store.preview("a","u")).settings.logLines).toBe(20);
 f.setRows([row("They move to Bridge.<phone-state>loc: Bridge</phone-state>")]);
 expect((await f.store.preview("a","u")).state.scene.location?.value).toEqual({name:"Bridge",wider:[]});
 expect((f.store as any).replayCache.doc).not.toBe(first);
 f.setRows([row("They return to Gate.<phone-state>loc: Gate</phone-state>",1)]);
 expect((await f.store.preview("a","u")).state.scene.location?.value).toEqual({name:"Gate",wider:[]});
 f.setRows([]);expect((await f.store.preview("a","u")).state.scene.location).toBeUndefined();
 f.setPlayer("New player");expect((await f.store.preview("a","u")).currentPlayer).toBe("New player");
 expect((await f.store.preview("a","v")).currentPlayer).toBe("Other player");
 const beforeNames=(f.store as any).replayCache.key;f.setNames(["New card"]);await f.store.preview("a","v");
 expect((f.store as any).replayCache.key).not.toBe(beforeNames);
 const doc=emptyDocument("a");doc.settings.logLines=7;f.setRaw(JSON.stringify(doc));
 expect((await f.store.preview("a","u")).settings.logLines).toBe(7);
});
test("replay cache is one bounded entry and skips oversized legacy payloads",async()=>{
 const f=fixture();await f.store.preview("a","u");
 expect((f.store as any).replayCache.bytes).toBeLessThanOrEqual(2*1024*1024);
 const doc=emptyDocument("a");doc.legacy={schema:1,chatId:"a",entries:[],padding:"x".repeat(2*1024*1024)};
 f.setRaw(JSON.stringify(doc));await f.store.preview("a","u");
 expect((f.store as any).replayCache).toBeUndefined();
});
test("old prose-bearing journals rebuild identically while new journals avoid copying story prose",async()=>{
 const source=row("The scene is at Gate.<phone-state>loc: Gate</phone-state>");
 const doc=replay(emptyDocument("a"),[source],["Player"]);expect(doc.accepted[0].prose).toBe("");
 const legacy=structuredClone(doc);legacy.accepted[0].prose="The scene is at Gate.";
 expect(replay(readDocument(JSON.stringify(legacy),"a"),[source],["Player"])).toEqual(doc);
 const f=fixture();f.setRaw(JSON.stringify(legacy));
 await f.store.update("u","a",legacy.revision,{settings:{logLines:8}});
 expect(f.rows()[0].content).toBe(source.content);
 expect((await f.store.preview("a","u")).state.scene.location?.value).toEqual({name:"Gate",wider:[]});
});
test("lean history uses active content with explicit capability and falls back on older hosts",async()=>{
 const calls:unknown[]=[];
 const message={...row("Selected swipe",1),name:"Ada",swipes:["old".repeat(10000),"Selected swipe"],swipe_dates:[1,2],extra:{reasoning:"large".repeat(10000)}};
 const api:any={host:{capabilities:{"chat-lean-messages-v1":1}},chat:{getMessages:async(...args:unknown[])=>{calls.push(args);return [message];}}};
 const lean=await readStoryHistory(api,"a");
 expect(calls[0]).toEqual(["a",{light:true,includeExtra:false,ownMetadataOnly:true}]);
 expect(lean[0].content).toBe("Selected swipe");expect(lean[0].swipe_dates?.[1]).toBe(2);
 expect("extra" in lean[0]).toBe(false);expect("swipes" in lean[0]).toBe(false);
 api.host.capabilities={};expect(await readStoryHistory(api,"a")).toEqual(lean);expect(calls[1]).toEqual(["a"]);
});
test("tag offsets preserve non-ASCII case expansion and hiding remains safe",()=>{
 const text='İris 🌸 <phone-text from="Ada">Hello</phone-text> After';
 const span=scanTags(text)[0];expect(text.slice(span.start,span.end)).toBe('<phone-text from="Ada">Hello</phone-text>');
 expect(transformTags(text,"strip")).toBe("İris 🌸  After");expect(transformTags(text,"display")).toBe(text);
 expect(transformTags('Story <phone-text from="Ada"',"display")).toBe("Story ");
 expect(transformTags('<phone-text from="Ada">Hi</phone-text>'.repeat(10000),"strip")).toBe("");
});

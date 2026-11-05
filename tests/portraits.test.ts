import {test,expect} from "bun:test";
import {APP_IMAGES} from "../src/app-icons";
import {portraitBytes,rasterType,portraitSource,initialTone,PORTRAIT_CHAT_LIMIT,PORTRAIT_INPUT_LIMIT} from "../src/portraits";
import {loadPortraitSources} from "../src/portrait-sources";
import {emptyDocument} from "../src/model";
import {PhoneStore,readDocument} from "../src/phone-store";
import {formatMacro} from "../src/phone-macros";
import {helperInput} from "../src/helper";
import {conversations,emptyReads,replyTag} from "../src/messages";
import {replay,type StoryRow} from "../src/engine";
const png=APP_IMAGES.Scene;
const row=(i:number,content:string):StoryRow=>({id:`m${i}`,chat_id:"c",index_in_chat:i,role:"assistant",swipe_id:0,content});
test("portrait priority is exact-name only; player's avatar uses own persona, never another card",()=>{
 const sources={characters:[{name:"Ada",data:"card"}],persona:{name:"Player",data:"own"}};
 expect(portraitSource("ADA",{ada:"custom"},sources)).toBe("custom");expect(portraitSource("Ada",{},sources)).toBe("card");expect(portraitSource("Ada Lovelace",{},sources)).toBeUndefined();
 expect(portraitSource("Player",{},sources,true)).toBe("own");expect(portraitSource("Other player",{},sources,true)).toBeUndefined();
 expect(portraitSource("Ada",{},{characters:[{name:"Ada",data:"other"}],persona:{name:"Player",data:"own"}},true)).toBeUndefined();
 expect(portraitSource("Ada",{},{characters:[{name:"Ada",data:"one"},{name:"ada",data:"two"}]})).toBeUndefined();
 expect(initialTone("Ada")).toBe(initialTone("ADA"));expect(initialTone("Ada")).toBeLessThan(5);
});
test("raster validation rejects SVG, false types, GIF and oversized stored data",()=>{
 expect(portraitBytes(png).length).toBeGreaterThan(0);expect(()=>rasterType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toThrow();
 expect(()=>portraitBytes(png.replace("image/png","image/jpeg"))).toThrow();expect(()=>portraitBytes('data:image/svg+xml;base64,PHN2Zy8+')).toThrow();expect(()=>rasterType(new TextEncoder().encode("GIF89a........"))).toThrow();
 expect(()=>portraitBytes('data:image/png;base64,'+'A'.repeat(30000))).toThrow();
});
test("avatar calls use trusted userId and optional grants; same-chat persona data stays separate",async()=>{
 const calls:string[]=[];let grants=new Set(["images","characters","personas"]);
 const check=(u:string)=>{if(!u)throw Error("userId is required for operator-scoped extensions");calls.push(u);};
 const api={permissions:{has:(p:string)=>grants.has(p)},chats:{get:async(c:string,u:string)=>{check(u);return {id:c,character_id:"card"};}},characters:{get:async(id:string,u:string)=>{check(u);return {name:"Ada",image_id:"npc"};}},personas:{getActive:async(u:string)=>{check(u);return {name:u==="u"?"Player":"Other",image_id:u};}},images:{readBinary:async(id:string,u:string)=>{check(u);expect(id!=="u"||u==="u").toBe(true);expect(id!=="v"||u==="v").toBe(true);return portraitBytes(id==="v"?APP_IMAGES.Bank:png,PORTRAIT_INPUT_LIMIT);}}};
 const a=await loadPortraitSources(api as never,"shared","u","Player"),b=await loadPortraitSources(api as never,"shared","v","Other");expect(a.persona?.name).toBe("Player");expect(b.persona?.name).toBe("Other");expect(a.characters[0].name).toBe("Ada");expect(a.persona?.data).toBe(png);expect(b.persona?.data).toBe(APP_IMAGES.Bank);
 const count=calls.length;expect(await loadPortraitSources(api as never,"shared","","Player")).toEqual({characters:[]});expect(calls.length).toBe(count);
 grants=new Set();expect(await loadPortraitSources(api as never,"shared","u","Player")).toEqual({characters:[]});expect(calls.length).toBe(count+1);
 grants=new Set(["images","personas"]);expect((await loadPortraitSources(api as never,"shared","u","Wrong name")).persona).toBeUndefined();
});
test("custom portraits are authorized shared chat data; survive rebuild, rename, removal and cannot enter AI output",async()=>{
 let disk="";const history=[row(0,'<phone-state>present: Ada\nc: Ada | roles=Friend</phone-state>')];
 const io={authorize:async(c:string,u:string)=>c==="c"&&["u","v"].includes(u),read:async()=>disk,write:async(c:string,v:string)=>{disk=v;},history:async()=>history,player:async()=>"Player"};const store=new PhoneStore(io);
 let d=await store.sync("u","c");const beforeFormat=formatMacro(d);d=await store.update("u","c",d.revision,{portrait:{name:"Ada",data:png}});d=await new PhoneStore(io).sync("v","c");expect(d.portraits?.ada).toBe(png);expect(formatMacro(d)).toBe(beforeFormat);
 expect(formatMacro(d)).not.toContain("base64");expect(JSON.stringify(helperInput({doc:d,recent:history,history:""}))).not.toContain("base64");
 await expect(store.update("stranger","c",d.revision,{portrait:{name:"Ada",data:null}})).rejects.toThrow();await expect(store.update("u","c",d.revision,{portrait:{name:"Not a contact",data:png}})).rejects.toThrow();
 d=await store.update("v","c",d.revision,{edit:{target:"contact",name:"Ada",rename:"ADA",value:{}}});expect(d.portraits?.ada).toBe(png);
 d=await store.update("u","c",d.revision,{edit:{target:"contact",name:"ADA",rename:"Bea",value:{}}});expect(d.portraits?.ada).toBeUndefined();expect(d.portraits?.bea).toBe(png);
 d=await store.update("v","c",d.revision,{portrait:{name:"Bea",data:null}});expect(d.portraits).toEqual({});
 await expect(store.update("u","c",0,{portrait:{name:"Bea",data:png}})).rejects.toThrow();
 const huge=emptyDocument("c");huge.portraits=Object.fromEntries(Array.from({length:Math.ceil(PORTRAIT_CHAT_LIMIT/png.length)+1},(_,i)=>[String(i),png]));expect(()=>readDocument(JSON.stringify(huge),"c")).toThrow("full");
});
test("explicit groups keep participants together, dates come only from saved scene and replies escape the group",()=>{
 const rows=[row(0,'<phone-state>date: Thursday</phone-state><phone-text from="Ada" group="Crew">First</phone-text>'),row(1,'<phone-text from="Ada" to="Player" group="Crew">Second</phone-text>'),row(2,'<phone-state>date: Friday</phone-state><phone-text from="Bea" group="Crew">Third</phone-text>'),row(3,'<phone-text from="Cara">Direct</phone-text>')];
 const doc=replay(emptyDocument("c"),rows,["Player"]),threads=conversations(doc.state.messages,emptyReads());expect(threads.map(t=>t.name)).toEqual(["Cara","Crew"]);expect(threads[1].messages.map(m=>m.date)).toEqual(["Thursday","Thursday","Friday"]);expect(threads[1].group).toBe(true);expect(formatMacro(doc)).toContain("[Crew]");
 const tag=replyTag("Player","Crew","A < B & C",'Crew "A"');expect(tag).toContain('group="Crew &quot;A&quot;"');expect(tag).toContain("A &lt; B &amp; C");
 const wrong=replay(emptyDocument("c"),[row(0,'<phone-text from="Ada" to="Bea" group="Crew">Not for player</phone-text>')],["Player"]);expect(wrong.state.messages).toEqual([]);
});

test("the one-time draft explanation is personal, survives restart and does not affect another user",async()=>{
 const {PreferenceStore,defaultPreferences}=await import("../src/preferences");const disk=new Map<string,unknown>();const io={read:async(u:string)=>disk.get(u)??defaultPreferences(),write:async(u:string,p:unknown)=>{disk.set(u,p);}};
 await new PreferenceStore(io).update("u",{dismiss:"Draft hint"});expect((await new PreferenceStore(io).read("u")).dismissed).toContain("Draft hint");expect((await new PreferenceStore(io).read("v")).dismissed).not.toContain("Draft hint");
});

test("a full shared portrait budget rejects a new upload without evicting existing portraits",async()=>{
 const raw=portraitBytes(png),size=18000-raw.length-12,kind=new TextEncoder().encode("tEXt"),payload=new TextEncoder().encode("Comment\u0000"+"a".repeat(size-8));const chunk=new Uint8Array(size+12),view=new DataView(chunk.buffer);view.setUint32(0,size);chunk.set(kind,4);chunk.set(payload,8);let crc=0xffffffff;for(const b of chunk.subarray(4,chunk.length-4)){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}view.setUint32(chunk.length-4,(crc^0xffffffff)>>>0);
 const bytes=new Uint8Array(raw.length+chunk.length);bytes.set(raw.subarray(0,-12));bytes.set(chunk,raw.length-12);bytes.set(raw.subarray(-12),raw.length-12+chunk.length);const padded=`data:image/png;base64,${btoa(String.fromCharCode(...bytes))}`;expect(portraitBytes(padded).length).toBe(18000);
 let initial=emptyDocument("c");initial.edits=Array.from({length:23},(_,i)=>({id:`p${i}`,after:null,index:-1,target:"contact" as const,name:`Person ${i}`,value:{}}));initial=replay(initial,[],["Player"]);const allowed=Math.floor(PORTRAIT_CHAT_LIMIT/padded.length);initial.portraits=Object.fromEntries(Array.from({length:allowed},(_,i)=>[`person ${i}`,padded]));let disk=JSON.stringify(initial);
 const store=new PhoneStore({authorize:async(c,u)=>c==="c"&&u==="u",read:async()=>disk,write:async(c,v)=>{disk=v;},history:async()=>[],player:async()=>"Player"});let doc=await store.sync("u","c");const before=disk;
 await expect(store.update("u","c",doc.revision,{portrait:{name:`Person ${allowed}`,data:padded}})).rejects.toThrow("full");expect(disk).toBe(before);doc=await store.sync("u","c");expect(Object.keys(doc.portraits??{}).length).toBe(allowed);
});

import {test,expect} from "bun:test";
import {PhoneStore} from "../src/phone-store";
import {emptyDocument} from "../src/model";
import type {StoryRow} from "../src/engine";
import {fingerprint,jsonBytes,performanceLine,type PerformanceSample} from "../src/performance";
const row=(time="Evening",swipe=0):StoryRow=>({id:"m",chat_id:"a",index_in_chat:0,role:"assistant",swipe_id:swipe,content:`<phone-state>time: ${time}</phone-state>`});
function gate(){let release!:()=>void;const promise=new Promise<void>(r=>release=r);return {promise,release};}
function fixture(){let raw=JSON.stringify(emptyDocument("a")),rows=[row()],reads=0,allowed=true;const samples:PerformanceSample[]=[];
 const io={authorize:async(c:string,u:string)=>allowed&&c==="a"&&u==="u",read:async()=>raw,write:async(_c:string,s:string)=>{raw=s;},history:async()=>{reads++;return structuredClone(rows);},player:async()=>"Player",performance:(s:PerformanceSample)=>samples.push(s)};
 return {io,store:new PhoneStore(io),setRows:(r:StoryRow[])=>rows=r,reads:()=>reads,revoke:()=>allowed=false,samples};}

test("framed fingerprints detect IDs, edits, deletions, order, selected swipes and surrogate differences",()=>{
 const a=row();const original=fingerprint([a]);for(const changed of [[{...a,id:"other"}],[{...a,content:a.content+" "}],[{...a,swipe_id:1}],[{...a,swipe_dates:[3]}],[]])expect(fingerprint(changed)).not.toBe(original);
 expect(fingerprint([a,{...a,id:"b"}])).not.toBe(fingerprint([{...a,id:"b"},a]));
 expect(fingerprint("x".repeat(8191)+"\ud800")).not.toBe(fingerprint("x".repeat(8191)+"\ufffd"));
 expect(fingerprint({b:1,a:2},true)).toBe(fingerprint({a:2,b:1,z:undefined},true));
});

test("streaming byte counts match JSON including escaped text, emoji, portraits and bounded traversal",()=>{
 for(const v of [{a:'hello\n"\\\u0001',b:"🌸⠀",c:undefined,d:[undefined,null,1]},"\ud800",{portrait:"data:image/png;base64,"+"a".repeat(500000)}])expect(jsonBytes(v)).toBe(Buffer.byteLength(JSON.stringify(v),"utf8"));
 expect(jsonBytes({big:"a".repeat(2000000)},1024)).toBeGreaterThan(1024);expect(jsonBytes({big:"a".repeat(2000000)},1024)).toBeLessThan(1040);
});

test("cheap authorized settings do not wait behind a blocked history rebuild and never write",async()=>{
 const f=fixture(),started=gate(),release=gate();const original=f.io.history;f.io.history=async()=>{started.release();await release.promise;return original();};
 const pending=f.store.preview("a","u");await started.promise;
 try{const result=await Promise.race([f.store.settingsPreview("u","a"),new Promise<never>((_,reject)=>setTimeout(()=>reject(Error("settings blocked")),100))]);expect(result.settings.source).toBe("main");await expect(f.store.settingsPreview("bad","a")).rejects.toThrow("Chat unavailable");}finally{release.release();await pending;}
});

test("a running follow-up shares its validated result, snapshots are small and independently owned",async()=>{
 const f=fixture(),first=gate(),startFirst=gate(),second=gate(),startSecond=gate();const original=f.io.history;let n=0;
 f.io.history=async()=>{const captured=await original();if(++n===1){startFirst.release();await first.promise;}else if(n===2){startSecond.release();await second.promise;}return captured;};
 const a=f.store.previewSnapshot("a","u");await startFirst.promise;f.setRows([row("Morning",1)]);
 const b=f.store.syncSnapshot("u","a");first.release();await startSecond.promise;
 const rest=Array.from({length:20},()=>f.store.syncSnapshot("u","a"));second.release();const [initial,latest,...others]=await Promise.all([a,b,...rest]);
 expect(f.reads()).toBe(2);expect(initial.state.scene.time?.value).toBe("Evening");expect(latest.state.scene.time?.value).toBe("Morning");expect(latest).not.toHaveProperty("accepted");expect(latest).not.toHaveProperty("legacy");latest.settings.logLines=99;expect(others[0].settings.logLines).toBe(20);expect((f.store as any).pendingReads.size).toBe(0);expect((f.store as any).pendingRefreshCount).toBe(0);
});

test("a trusted mutation during a running follow-up forces a fresh result, repeated queued notices combine",async()=>{
 const f=fixture(),g1=gate(),s1=gate(),g2=gate(),s2=gate();const original=f.io.history;let n=0;f.io.history=async()=>{const rows=await original();n++;if(n===1){s1.release();await g1.promise;}if(n===2){s2.release();await g2.promise;}return rows;};
 const a=f.store.preview("a","u");await s1.promise;const b=f.store.preview("a","u");g1.release();await s2.promise;f.setRows([row("Dawn",2)]);f.store.invalidate("a");const c=f.store.sync("u","a");f.store.invalidate("a");const d=f.store.sync("u","a");g2.release();await Promise.all([a,b]);expect((await c).state.scene.time?.value).toBe("Dawn");expect((await d).state.scene.time?.value).toBe("Dawn");expect(f.reads()).toBe(3);
});

test("a queued edit remains a barrier to later refreshes",async()=>{
 const f=fixture();const d=await f.store.sync("u","a");const before=f.store.previewSnapshot("a","u");const write=f.store.update("u","a",d.revision,{settings:{logLines:7}});const after=f.store.previewSnapshot("a","u");expect((await before).settings.logLines).toBe(20);await write;expect((await after).settings.logLines).toBe(7);
});

test("revoked users cannot receive a combined snapshot, and failed batches release pending state",async()=>{
 const f=fixture(),entered=gate(),release=gate();f.io.history=async()=>{entered.release();await release.promise;return [row()];};const a=f.store.previewSnapshot("a","u");await entered.promise;const b=f.store.previewSnapshot("a","u");f.revoke();release.release();const result=await Promise.allSettled([a,b]);expect(result.every(r=>r.status==="rejected")).toBe(true);expect((f.store as any).pendingReads.size).toBe(0);expect((f.store as any).pendingRefreshCount).toBe(0);
});

test("performance records contain only allowed counters, and a failed logger never breaks tracking",async()=>{
 const f=fixture();await f.store.syncSnapshot("u","a");expect(f.samples.some(s=>s.operation==="build"&&s.rebuildCount===1&&s.historyMessages===1&&s.historyBytes>0&&s.snapshotBytes>0)).toBe(true);
 const line=performanceLine({...f.samples[0],operation:"PRIVATE story credential",durationMs:Infinity,pendingRefreshes:-3} as any);expect(line).not.toContain("PRIVATE");expect(line).not.toContain("Player");expect(line).not.toContain("Evening");expect(JSON.parse(line.slice(line.indexOf("{"))).pendingRefreshes).toBe(0);
 f.io.performance=()=>{throw Error("logger unavailable");};await expect(f.store.sync("u","a")).resolves.toBeDefined();
});


test("ready UI opens share a saved read without fetching history and keep per-user authorization",async()=>{
 const f=fixture();await f.store.sync("u","a");const original=f.io.read;let savedReads=0;f.io.read=async()=>{savedReads++;return original();};const snapshots=await Promise.all(Array.from({length:20},()=>f.store.openSnapshot("a","u")));expect(savedReads).toBe(1);expect(f.reads()).toBe(1);expect(snapshots[0]).not.toHaveProperty("accepted");snapshots[0].state.notices.push("local change");expect(snapshots[1].state.notices).not.toContain("local change");await expect(f.store.openSnapshot("a","bad")).rejects.toThrow("Chat unavailable");
});

test("a rejected shared read releases its queue and a later fresh read recovers",async()=>{
 const f=fixture(),original=f.io.history;f.io.history=async()=>{throw Error("private provider or story text");};const results=await Promise.allSettled(Array.from({length:10},()=>f.store.syncSnapshot("u","a")));expect(results.every(r=>r.status==="rejected")).toBe(true);expect((f.store as any).queues.size).toBe(0);expect((f.store as any).pendingReads.size).toBe(0);expect((f.store as any).pendingRefreshCount).toBe(0);expect(f.samples.some(s=>s.failed)).toBe(true);f.io.history=original;await expect(f.store.syncSnapshot("u","a")).resolves.toBeDefined();
});

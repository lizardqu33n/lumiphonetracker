import { describe, expect, test } from "bun:test";
import { HelperAI, helperInput, helperValues, type HelperIO } from "../src/helper";
import { PhoneStore, type PhoneIO } from "../src/phone-store";
import { emptyDocument, defaults } from "../src/model";
import { replay, type StoryRow } from "../src/engine";
import { HelperFailure, HELPER_FAILURES, failureCategory, readRefreshResult } from "../src/helper-status";
import { formatMacro } from "../src/phone-macros";

const row=(id:number,content="Rain falls. Ada stands at the Station."):StoryRow=>({id:`m${id}`,chat_id:"a",index_in_chat:id,role:"assistant",swipe_id:0,content});
function fixture(timeoutMs=90000) {
  const saved=new Map<string,string>();const rows=new Map<string,StoryRow[]>([["a",[row(0)]],["b",[{...row(0,"Other story."),chat_id:"b"}]]]);
  const io:PhoneIO={authorize:async(c,u)=>u===`owner-${c}`,read:async c=>saved.get(c)??"",write:async(c,s)=>{saved.set(c,s);},history:async c=>structuredClone(rows.get(c)??[]),player:async()=>"Player"};
  const store=new PhoneStore(io);const calls:Parameters<HelperIO["generate"]>[0][]=[];const logs:string[]=[];const changes:string[]=[];
  let profiles=[{id:"small",name:"Small saved connection",model:"chosen-small-model"}];let allowed=true;let output='weather: Rain';let responder:HelperIO["generate"]|null=null;
  const helperIO:HelperIO={allowed:()=>allowed,connections:async()=>structuredClone(profiles),generate:async input=>{if(!input.model?.trim())throw Error("Provider rejected request: model is required");calls.push(input);return responder?responder(input):{content:output,finish_reason:"stop"};},changed:(_,c)=>{changes.push(c);},warn:s=>logs.push(s)};
  const helper=new HelperAI(store,helperIO,timeoutMs);
  return {store,io,helper,helperIO,saved,rows,calls,logs,changes,profiles:(v:typeof profiles)=>{profiles=v;},allow:(v:boolean)=>{allowed=v;},output:(v:string)=>{output=v;},respond:(v:HelperIO["generate"])=>{responder=v;},
    enable:async()=>{const doc=await store.sync("owner-a","a");return store.update("owner-a","a",doc.revision,{settings:{source:"helper",connection_id:"small"}});}};
}
async function dispatched(f:ReturnType<typeof fixture>){for(let i=0;i<50&&!f.calls.length;i++)await Bun.sleep(1);expect(f.calls.length).toBe(1);}
describe("Step 6 Helper AI",()=>{
  test("Main AI defaults, disabled permission and unrelated users never make a model request",async()=>{
    const f=fixture();expect(defaults().source).toBe("main");expect(defaults().helperMessages).toBe(3);
    await f.helper.updateNow("owner-a","a");f.helper.ended("owner-a",{chatId:"a",generationId:"normal",messageId:"m0",content:f.rows.get("a")![0].content});await f.helper.settled("a");
    expect(f.calls).toEqual([]);await f.enable();f.allow(false);await f.helper.updateNow("owner-a","a");expect(f.calls).toEqual([]);
    f.allow(true);await f.helper.updateNow("other-user","a");expect(f.calls).toEqual([]);
  });
  test("only final saved assistant replies run automatically, once across duplicate events and restarts",async()=>{
    const f=fixture();await f.enable();f.helper.started("a","g");await f.helper.updateNow("owner-a","a");expect(f.calls.length).toBe(0);
    f.helper.ended("owner-a",{chatId:"a",generationId:"g",messageId:"m0",content:f.rows.get("a")![0].content});await f.helper.settled("a");expect(f.calls.length).toBe(1);
    f.helper.ended("owner-a",{chatId:"a",generationId:"g",messageId:"m0",content:f.rows.get("a")![0].content});await f.helper.settled("a");
    const restarted=new HelperAI(new PhoneStore(f.io),f.helperIO);restarted.ended("owner-a",{chatId:"a",generationId:"g",messageId:"m0",content:f.rows.get("a")![0].content});await restarted.settled("a");expect(f.calls.length).toBe(1);
    restarted.started("a","stopped");restarted.stopped("a","stopped");restarted.ended("owner-a",{chatId:"a",generationId:"failed",error:"Private provider error"});await restarted.settled("a");expect(f.calls.length).toBe(1);
    restarted.ended("owner-a",{chatId:"a",generationId:"raw-helper",content:"{}"});await restarted.settled("a");expect(f.calls.length).toBe(1);
  });
  test("last N messages are cleaned, current tracker is compact, connection ID is the only saved profile data",async()=>{
    const f=fixture();f.rows.set("a",Array.from({length:5},(_,i)=>row(i,`Story ${i}.<phone-state>time="Night"</phone-state><phone-text from="Ada">Hidden text ${i}</phone-text>`)));
    await f.enable();await f.helper.updateNow("owner-a","a");expect(f.calls.length).toBe(1);
    const input=f.calls[0];expect(input.model).toBe("chosen-small-model");expect(input.connection_id).toBe("small");expect(input.userId).toBe("owner-a");expect(input.messages?.length).toBe(2);
    const data=JSON.parse(String(input.messages![1].content));expect(data.recent_messages.map((r:{text:string})=>r.text)).toEqual(["Story 2.","Story 3.","Story 4."]);
    expect(data.current_tracker).toContain("Night");expect(JSON.stringify(input.messages)).not.toContain("Hidden text");expect(JSON.stringify(data)).not.toContain("<phone-state>");expect(JSON.stringify(data)).not.toContain("<phone-text");
    const settings=JSON.parse(f.saved.get("a")!).settings;expect(settings.connection_id).toBe("small");expect(JSON.stringify(settings)).not.toContain("chosen-small-model");expect(JSON.stringify(settings)).not.toContain("api_key");
  });
  test("missing connection falls back to Main AI with the exact notice and no paid request",async()=>{
    const f=fixture();await f.enable();f.profiles([]);await f.helper.updateNow("owner-a","a");const doc=await f.store.preview("a", "owner-a");
    expect(doc.settings.source).toBe("main");expect(doc.state.notices).toContain("Connection not found. Tracker update failed: No connection");expect(f.calls.length).toBe(0);expect(formatMacro(doc)).toContain("phone-state");
  });
  test("helper results rebuild across restart and vanish with a deleted, edited or alternate source",async()=>{
    const f=fixture();await f.enable();await f.helper.updateNow("owner-a","a");expect((await new PhoneStore(f.io).preview("a", "owner-a")).state.weather?.value).toBe("Rain");
    f.rows.get("a")![0].content+='<phone-text from="Ada">A changed actual text.</phone-text>';expect((await f.store.preview("a", "owner-a")).state.weather?.value).toBe("Rain");
    f.rows.set("a",[row(0,"A different regenerated scene.")]);expect((await f.store.preview("a", "owner-a")).state.weather).toBeUndefined();
    f.rows.set("a",[{...row(0),swipe_id:1}]);expect((await f.store.preview("a", "owner-a")).state.weather).toBeUndefined();
    f.rows.set("a",[]);expect((await f.store.preview("a", "owner-a")).state.weather).toBeUndefined();
  });
  test("the shared schema handles Scene, Contacts, Locations and Notes without creating texts or player thoughts",async()=>{
    const f=fixture();f.rows.set("a",[row(0,"Ada and Player wait at Station, a departure point. Ada is Unhurt and wears a red coat. Player is Healthy. Ada states the firm Gate rule: Keep locked.")]);
    await f.enable();f.output(JSON.stringify({location:"Station",present:["Ada","Player"],weather:null,contacts:[{name:"Ada",physical:"Unhurt",attire:{worn:["red coat"],removed:[]}},{name:"Player",mood:"Happy",thoughts:"Private",physical:"Healthy"}],locations:[{name:"Station",description:"A departure point"}],rules:[{name:"Gate",detail:"Keep locked",context:"Stated by Ada"}]}));
    await f.helper.updateNow("owner-a","a");const doc=await new PhoneStore(f.io).preview("a", "owner-a");
    expect(doc.state.scene.location?.value).toEqual({name:"Station",wider:[]});expect(doc.state.contacts.find(c=>c.name==="Ada")?.fields.attire?.value).toEqual({worn:["red coat"],removed:[]});
    expect(doc.state.contacts.find(c=>c.name==="Player")?.fields.mood).toBeUndefined();expect(doc.state.contacts.find(c=>c.name==="Player")?.fields.thoughts).toBeUndefined();
    expect(doc.state.locations).toEqual([]);expect(doc.state.notes.rules[0].detail).toBe("Keep locked");expect(doc.state.messages).toEqual([]);expect(doc.state.weather).toBeUndefined();
    expect(formatMacro(doc)).toContain("Do not write a phone-state block");expect(formatMacro(doc)).not.toContain("End each reply with");
  });
  test("late response remains in its requesting chat and cannot overwrite a later user edit",async()=>{
    const f=fixture();await f.enable();let finish!:(value:{content:string;finish_reason:string})=>void;
    f.respond(()=>new Promise(resolve=>{finish=resolve;}));const task=f.helper.updateNow("owner-a","a");await dispatched(f);
    await f.store.sync("owner-b","b");finish({content:'{"weather":"Rain"}',finish_reason:"stop"});await task;
    expect((await f.store.preview("a", "owner-a")).state.weather?.value).toBe("Rain");expect((await f.store.preview("b", "owner-b")).state.weather).toBeUndefined();expect(f.changes.every(c=>c==="a")).toBe(true);
    const later=f.helper.updateNow("owner-a","a");for(let i=0;i<50&&f.calls.length<2;i++)await Bun.sleep(1);
    const doc=await f.store.sync("owner-a","a");await f.store.update("owner-a","a",doc.revision,{edit:{target:"weather",value:"Snow"}});
    finish({content:'{"weather":"Old rain"}',finish_reason:"stop"});await later;expect((await f.store.preview("a", "owner-a")).state.weather?.value).toBe("Snow");expect(f.calls.length).toBe(2);
    expect((await f.store.preview("a", "owner-a")).state.notices).toContain("Tracker update failed: Validation rejected");
  });
  test("new history during a request and switching Main AI discard late results without retries",async()=>{
    const f=fixture();await f.enable();let finish!:(value:{content:string;finish_reason:string})=>void;f.respond(()=>new Promise(resolve=>{finish=resolve;}));
    const task=f.helper.updateNow("owner-a","a");await dispatched(f);f.rows.get("a")!.push(row(1,"New confirmed sunny scene."));finish({content:'{"weather":"Rain"}',finish_reason:"stop"});await task;
    expect((await f.store.preview("a", "owner-a")).state.weather).toBeUndefined();expect(f.calls.length).toBe(1);
    const again=f.helper.updateNow("owner-a","a");for(let i=0;i<50&&f.calls.length<2;i++)await Bun.sleep(1);
    const doc=await f.store.sync("owner-a","a");await f.store.update("owner-a","a",doc.revision,{settings:{source:"main"}});f.helper.cancel("a");
    expect(f.calls[1].signal?.aborted).toBe(true);finish({content:'{"weather":"Rain"}',finish_reason:"stop"});await again;await f.helper.updateNow("owner-a","a");expect(f.calls.length).toBe(2);expect((await f.store.preview("a", "owner-a")).settings.source).toBe("main");
  });
  test("invalid JSON, forbidden texts, schema failures and provider errors keep old values and log safely",async()=>{
    for(const output of ['not-json private-secret','{"messages":["private-secret"]}','{"weather":123}','```json\n{bad}\n```']){
      const f=fixture();f.rows.set("a",[row(0,'<phone-state>weather="Clear"</phone-state>')]);await f.enable();f.output(output);
      await f.helper.updateNow("owner-a","a");expect((await f.store.preview("a", "owner-a")).state.weather?.value).toBe("Clear");expect((await f.store.preview("a", "owner-a")).state.notices.some(n=>n.startsWith("Tracker update failed:"))).toBe(true);
      expect(f.calls.length).toBe(1);expect(f.logs.join()).not.toContain("private-secret");expect(f.logs.join()).not.toContain("Clear");
    }
    const f=fixture();await f.enable();f.respond(async()=>{throw new Error("Private provider secret");});await f.helper.updateNow("owner-a","a");expect(f.calls.length).toBe(1);expect(f.logs.join()).not.toContain("Private provider secret");
  });
  test("nulls mean no update, off fields are dropped, player private fields and Misc/texts are forbidden",()=>{
    const doc=emptyDocument("a");doc.settings.enabled.weather=false;doc.playerNames=["Player"];
    expect(helperValues('{"weather":"Rain","time":null,"contacts":[{"name":"Player","mood":"Happy","physical":"Healthy"}]}',doc)).toEqual({time:null,contacts:[{name:"Player",physical:"Healthy"}]});
    expect(()=>helperValues('{"misc":[]}',doc)).toThrow();expect(()=>helperValues('{"texts":[]}',doc)).toThrow();
  });
  test("user-edited fields require a newer quote, and literal old facts do not replace newer confirmed fields",()=>{
    let doc=replay(emptyDocument("a"),[row(0,'Home. <phone-state>location="Home"</phone-state>'),row(1,'Station. <phone-state>location="Station"</phone-state>')],["Player"]);
    const rows=[row(0,"Home."),row(1,"Station."),row(2,"They talk.")];expect(helperValues('{"location":"Home"}',doc,rows)).toEqual({});
    doc.state.scene.location!.by="user";expect(helperValues('{"location":{"value":"Home","evidence":"Home."}}',doc,rows)).toEqual({});
    expect(helperValues('{"location":{"value":"Garden","evidence":"They move to Garden."}}',doc,[...rows,row(3,"They move to Garden.")])).toHaveProperty("location");
  });
  test("counts are bounded and no model call is made if all extractable items are off",async()=>{
    const f=fixture();await f.enable();let doc=await f.store.sync("owner-a","a");
    for(const n of [0,11,1.5])await expect(f.store.update("owner-a","a",doc.revision,{settings:{helperMessages:n}})).rejects.toThrow();
    doc=await f.store.update("owner-a","a",doc.revision,{settings:{enabled:Object.fromEntries(Object.keys(doc.settings.enabled).map(k=>[k,false]))}});
    await f.helper.updateNow("owner-a","a");expect(f.calls.length).toBe(0);
  });
});


describe("Part 2 safe refresh and Helper failures",()=>{
  test("Main refresh replays saved messages without generation permission or a model call",async()=>{
    const f=fixture();f.allow(false);f.rows.set("a",[row(0,"<phone-state>weather: Snow</phone-state>")]);
    expect(await f.helper.refresh("owner-a","a")).toEqual({ok:true});
    expect((await f.store.preview("a","owner-a")).state.weather?.value).toBe("Snow");
    f.rows.get("a")![0].content="<phone-state>weather: Sun</phone-state>";
    expect(await f.helper.refresh("owner-a","a")).toEqual({ok:true});
    expect((await f.store.preview("a","owner-a")).state.weather?.value).toBe("Sun");expect(f.calls.length).toBe(0);
    f.helper.started("a","stream");expect((await f.helper.refresh("owner-a","a")).ok).toBe(false);expect(f.calls.length).toBe(0);
  });
  test("connection listing authorizes first and carries the trusted user",async()=>{
    const f=fixture();const users:string[]=[];f.helperIO.connections=async user=>{if(!user)throw Error("userId is required for operator-scoped extensions");users.push(user);return [{id:"small",name:"PRIVATE name",model:"PRIVATE model"}];};
    expect((await f.helper.connections("intruder","a")).available).toBe(false);expect(users).toEqual([]);
    expect((await f.helper.connections("owner-a","a")).available).toBe(true);expect(users).toEqual(["owner-a"]);
    expect((await f.helper.refresh("","a")).category).toBe("permission missing");expect(f.logs.join()).not.toContain("PRIVATE");
  });
  test("all seven failure categories are returned, logged without exception details and keep data",async()=>{
    for(const category of HELPER_FAILURES){
      const f=fixture();f.rows.set("a",[row(0,"<phone-state>weather: Clear</phone-state>")]);await f.enable();
      if(category==="permission missing")f.allow(false);
      else if(category==="no connection")f.profiles([]);
      else if(category==="empty reply")f.output(" ");
      else if(category==="invalid output")f.output("PRIVATE prose");
      else if(category==="validation rejected")f.output("weather: unknown");
      else f.respond(async()=>{throw category==="timeout"?new HelperFailure("timeout"):Error("PRIVATE provider key model field");});
      expect(await f.helper.refresh("owner-a","a")).toEqual({ok:false,category});
      expect(f.logs).toEqual([`Lumi Phone Tracker: Helper AI: ${category}.`]);
      const doc=await f.store.preview("a","owner-a");expect(doc.state.weather?.value).toBe("Clear");
      expect(doc.state.notices.join()).toContain(category[0].toUpperCase()+category.slice(1));
      expect(f.calls.length).toBeLessThanOrEqual(1);
    }
  });
  test("small-model fences and partial valid fields work without repairing malformed content",()=>{
    const doc=emptyDocument("a");
    expect(helperValues('```text\nweather: Rain\ntime: unknown\n```',doc)).toEqual({weather:"Rain"});
    expect(helperValues('```json\n{"weather":"Rain","time":123}\n```',doc)).toEqual({weather:"Rain"});
    expect(helperValues('<phone-state>\nweather: Rain\n</phone-state>',doc)).toEqual({weather:"Rain"});
    expect(helperValues('{}',doc)).toEqual({});expect(helperValues('<phone-state></phone-state>',doc)).toEqual({});
    for(const content of ['Preface\n<phone-state>weather: Rain</phone-state>','```text\nweather: Rain','{"weather":"Rain"','<phone-text from="Ada">PRIVATE</phone-text>'])expect(()=>helperValues(content,doc)).toThrow();
  });
  test("provider ignoring cancellation still times out once; late content cannot land",async()=>{
    const f=fixture(5);await f.enable();let finish!:(value:{content:string;finish_reason:string})=>void;
    f.respond(()=>new Promise(resolve=>{finish=resolve;}));
    expect(await f.helper.refresh("owner-a","a")).toEqual({ok:false,category:"timeout"});expect(f.calls.length).toBe(1);expect(f.calls[0].signal?.aborted).toBe(true);
    finish({content:"weather: PRIVATE late",finish_reason:"stop"});await Bun.sleep(5);
    expect((await f.store.preview("a","owner-a")).state.weather).toBeUndefined();expect(f.calls.length).toBe(1);
  });
  test("successful refresh clears an earlier Helper notice and missing connection falls back",async()=>{
    const f=fixture();await f.enable();f.output("garbage");expect((await f.helper.refresh("owner-a","a")).category).toBe("invalid output");
    f.output("weather: Rain");expect(await f.helper.refresh("owner-a","a")).toEqual({ok:true});expect((await f.store.preview("a","owner-a")).state.notices).toEqual([]);
    f.profiles([]);await f.helper.connections("owner-a","a");expect((await f.store.preview("a","owner-a")).settings.source).toBe("main");expect(f.calls.length).toBe(2);
  });
  test("stopped event drain cannot lose an immediately following completed reply",async()=>{
    const f=fixture();await f.enable();f.helper.stopped("a","old");
    f.helper.ended("owner-a",{chatId:"a",generationId:"new",messageId:"m0",content:f.rows.get("a")![0].content});
    for(let i=0;i<50&&!f.calls.length;i++)await Bun.sleep(1);await f.helper.settled("a");expect(f.calls.length).toBe(1);
  });
  test("error classification never forwards arbitrary details",()=>{
    expect(failureCategory(Error("userId is required for operator-scoped extensions"))).toBe("permission missing");
    expect(failureCategory(Error("request timed out PRIVATE"))).toBe("timeout");
    expect(readRefreshResult({ok:false,category:"PRIVATE"})).toEqual({ok:false,category:"invalid output"});
  });
});

test("connection labels use an ASCII separator without mojibake",async()=>{const f=fixture();const result=await f.helper.connections("owner-a","a");expect(result.choices[0].label).toBe("Small saved connection - chosen-small-model");});

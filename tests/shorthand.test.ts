import { describe, expect, test } from "bun:test";
import { parseExpanded, parseExpandedReply } from "../src/schema";
import { patchValues, WORD_LIMITS } from "../src/shorthand";
import { emptyDocument, SWITCHES } from "../src/model";
import { replay, type StoryRow } from "../src/engine";
import { helperInput, helperValues } from "../src/helper";
import { formatMacro } from "../src/phone-macros";
import { transformTags } from "../src/tags";

const row=(i:number,body:string,prose="Ada and Player stand at Gate. Station is west."):StoryRow=>({
  id:`m${i}`,chat_id:"a",index_in_chat:i,role:"assistant",swipe_id:0,content:`${prose}<phone-state>\n${body}\n</phone-state>`});
const run=(rows:StoryRow[],doc=emptyDocument("a"))=>replay(doc,rows,["Player"]);
const repeat=(n:number)=>Array.from({length:n},()=>"word").join(" ");

describe("Part 1 shorthand and compliance",()=>{
  test("all record types map to the existing journal schema",()=>{
    const p=parseExpanded('loc: Gate | Old town; Rookhaven\ntime: 12:10 AM\ndate: Monday\nweather: Light rain\npresent: Ada; Player\nc: Ada | roles=guard; ally | phys=Unhurt | mood=Wary | pos=beside the gate | worn=blue wool coat; black boots | off= | thoughts=watch the road\np: Station | Closed brick station | West of Gate\npeople: Ivo | Will guide them | Meeting arranged\nitems: Brass key | Opens the vault | Ada carries it\nrules: Quiet approach | Do not ring the bell | Ada warned them\nplots: Meet Ivo | Meet at dawn | Promise to Ada');
    expect(p).not.toBeNull();const values=patchValues(p!);
    expect(values.location).toEqual({name:"Gate",wider:["Old town","Rookhaven"]});
    expect(values.present).toEqual(["Ada","Player"]);
    expect((values.contacts as any[])[0].attire).toEqual({worn:["blue wool coat","black boots"],removed:[]});
    expect((values.locations as any[])[0].description).toBe("Closed brick station");
    expect((values.items as any[])[0].detail).toBe("Opens the vault");
    expect(parseExpanded("")).not.toBeNull();
    expect(parseExpanded("weather: Rain &amp; wind")?.weather?.value).toBe("Rain & wind");
    expect(parseExpanded("weather: &lt;rain&gt;")).toBeNull();
  });
  test("old JSON and shorthand produce the same data, including old long values",()=>{
    const old='location={"name":"Gate","wider":["Town"]}\ntime="Dusk"\npresent=["Ada"]\ncontacts=[{"name":"Ada","position":"beside the gate","attire":{"worn":["blue coat"],"removed":[]}}]\nplots=[{"name":"Meet Ivo","resolved":true}]';
    const shorthand='loc: Gate | Town\ntime: Dusk\npresent: Ada\nc: Ada | pos=beside the gate | worn=blue coat | off=\ndone: Meet Ivo';
    expect(patchValues(parseExpanded(old)!)).toEqual(patchValues(parseExpanded(shorthand)!));
    expect(parseExpanded(`contacts=[{"name":"Ada","mood":"${repeat(20)}"}]`)).not.toBeNull();
    const legacy=run([row(0,'items=[{"name":"Key","detail":"Opens the vault","context":""}]')]);
    expect(legacy.state.notes.items[0].detail).toBe("Opens the vault");
    expect(legacy.state.notes.items[0].context).toBe("");
  });
  test("valid records survive malformed records; duplicates reject only that identity",()=>{
    const parsed=parseExpandedReply('<phone-state>\nweather: Rain\nc: Ada | mood=calm\nc: Ben | pos='+repeat(13)+'\npeople: Ivo | Returns at dawn | Promise\npeople: Ivo | Conflicting value | Promise\npeople: Nora | Has the key | Sent for\nsecret-key: private-value\n</phone-state>');
    expect(parsed.patch?.weather?.value).toBe("Rain");
    expect(parsed.patch?.contacts.map(c=>c.name)).toEqual(["Ada"]);
    expect(parsed.patch?.notes.people?.map(n=>n.name)).toEqual(["Nora"]);
    expect(parsed.issues.map(i=>i.field)).toContain("contacts");
    expect(JSON.stringify(parsed.issues)).not.toContain("private-value");expect(JSON.stringify(parsed.issues)).not.toContain("secret-key");
    expect(parseExpanded('loc: A\nloc: B\nweather: Rain')?.scene.location).toBeUndefined();
  });
  test("placeholder strings and empty attire are rejected without discarding good lines",()=>{
    for(const v of ["Absent","N/A","none","unknown","UNSPECIFIED"]) {
      const p=parseExpanded(`weather: ${v}\nc: Ada | mood=${v}\nc: Ben | worn=${v} | off=\ndate: Monday`)!;
      expect(p.weather).toBeUndefined();expect(p.contacts).toEqual([]);expect(p.scene.date?.value).toBe("Monday");
    }
    expect(parseExpanded('weather="unknown"')).toBeNull();
    expect(parseExpanded('contacts=[{"name":"Ada","attire":{"worn":[],"removed":[]}}]')).toBeNull();
    expect(parseExpanded('c: Ada | worn= | off=')).toBeNull();
    expect(parseExpanded('c: Ada | worn=blue coat')).toBeNull();
    expect(parseExpanded('c: Ada | worn= | off=blue coat')?.contacts[0].fields.attire?.value).toEqual({worn:[],removed:["blue coat"]});
  });
  test("hard word boundaries exclude evidence suffixes from value length",()=>{
    for(const key of ["mood","phys","pos"]) {
      expect(parseExpanded(`c: Ada | ${key}=${repeat(12)}`)).not.toBeNull();
      expect(parseExpanded(`c: Ada | ${key}=${repeat(13)}`)).toBeNull();
    }
    expect(parseExpanded(`p: Station | ${repeat(19)}`)).not.toBeNull();expect(parseExpanded(`p: Station | ${repeat(20)}`)).toBeNull();
    expect(parseExpanded(`items: Key | ${repeat(14)}`)).not.toBeNull();expect(parseExpanded(`items: Key | ${repeat(15)}`)).toBeNull();
    expect(parseExpanded(`c: Ada | worn=${repeat(6)} | off=`)).not.toBeNull();expect(parseExpanded(`c: Ada | worn=${repeat(7)} | off=`)).toBeNull();
    expect(parseExpanded(`c: Ada | pos=beside the gate ~ "Ada moves beside the gate with all the other people in this very long sentence."`)).not.toBeNull();
    expect(WORD_LIMITS.description).toBe(19);
  });
  test("bad separators, quotes, attributes, inference and oversized blocks fail safely",()=>{
    for(const body of ['time: A | B','p: A | B | ','c: Ada | mood=calm | ','c: Ada | mood=calm | mood=angry','weather: Rain ~ not-a-quote','weather: Rain ~ inferred','p: Place | room ~ inferred','items: Key | a < b','c: Ada | unknown=value','p: A | B | C | D']) expect(parseExpanded(body)).toBeNull();
    expect(parseExpanded('weather: '+"a".repeat(64000))).toBeNull();
    expect(parseExpandedReply('<phone-state>weather: Rain').patch).toBeNull();
    expect(parseExpandedReply('<phone-state>weather: Rain</phone-state><phone-state></phone-state>').patch).toBeNull();
    expect(transformTags('Story<phone-state>c: Ada | pos=beside',"display")).toBe("Story");
  });
  test("only confirmed present names create AI contacts; old absent contacts remain",()=>{
    const absent=run([row(0,'c: Ivo | mood=calm',"Ada mentions Ivo, who is away.")]);
    expect(absent.state.contacts.some(c=>c.name==="Ivo")).toBe(false);
    const doc=run([row(0,'present: Ada\nc: Ada | mood=calm'),row(1,'present: Player\nc: Ivo | mood=calm',"Player remembers Ivo, who is offscreen.")]);
    expect(doc.state.contacts.find(c=>c.name==="Ada")?.fields.mood?.value).toBe("calm");expect(doc.state.contacts.some(c=>c.name==="Ivo")).toBe(false);
  });
  test("placeholder updates, including old JSON, never erase established values",()=>{
    const doc=run([row(0,'present: Ada\nweather: Rain\nc: Ada | mood=calm | worn=blue coat | off='),
      row(1,'weather="unknown"\ncontacts=[{"name":"Ada","mood":"Absent","attire":{"worn":[],"removed":[]}}]')]);
    expect(doc.state.weather?.value).toBe("Rain");expect(doc.state.contacts.find(c=>c.name==="Ada")?.fields.mood?.value).toBe("calm");
    expect(doc.state.contacts.find(c=>c.name==="Ada")?.fields.attire?.value).toEqual({worn:["blue coat"],removed:[]});
  });
  test("current-location place records are not added a second time",()=>{
    const doc=run([row(0,'loc: Gate\np: Gate | Tall stone entrance\np: Station | Closed brick station | West of Gate')]);
    expect(doc.state.locations.map(p=>p.name)).toEqual(["Station"]);
  });
  test("exact evidence protects user edits and resolves plots",()=>{
    const doc=emptyDocument("a");doc.settings.allowAIUserEdits=true;doc.edits.push({id:"edit",target:"contact",name:"Ada",value:{position:"inside the room"},after:"m0",index:0});
    const first=row(0,'present: Ada\nc: Ada | pos=inside the room\nplots: Meet Ivo | Meet at dawn | Promise');
    expect(run([first,row(1,'c: Ada | pos=beside the gate')],doc).state.contacts.find(c=>c.name==="Ada")?.fields.position?.value).toBe("inside the room");
    const changed=run([first,row(1,'c: Ada | pos=beside the gate ~ "Ada moves beside the gate."\ndone: Meet Ivo',"Ada moves beside the gate. The meeting with Ivo is complete.")],doc);
    expect(changed.state.contacts.find(c=>c.name==="Ada")?.fields.position?.value).toBe("beside the gate");expect(changed.state.notes.plots[0].resolved).toBe(true);
  });
  test("inferred marker remains opt-in and cannot replace populated fields",()=>{
    const rows=[row(0,'present: Ada\nc: Ada | phys=scarred left hand ~ inferred')];
    expect(run(rows).state.contacts.find(c=>c.name==="Ada")?.fields.physical).toBeUndefined();
    const doc=emptyDocument("a");doc.settings.inferMissing=true;
    expect(run(rows,doc).state.contacts.find(c=>c.name==="Ada")?.fields.physical?.inferred).toBe(true);
  });
  test("same-source invalid contact keeps its old record without erasing a valid neighbor",()=>{
    const original=row(0,'present: Ada; Ben\nc: Ada | mood=calm\nc: Ben | mood=happy');const saved=run([original]);
    const edited=row(0,'present: Ada; Ben\nc: Ada | mood=unknown\nc: Ben | mood=angry');
    const next=run([edited],saved);expect(next.state.contacts.find(c=>c.name==="Ada")?.fields.mood?.value).toBe("calm");expect(next.state.contacts.find(c=>c.name==="Ben")?.fields.mood?.value).toBe("angry");
    expect(run([{...edited,swipe_id:1}],saved).state.contacts.find(c=>c.name==="Ada")?.fields.mood).toBeUndefined();
  });
  test("Helper uses the same shorthand parser and retains valid lines, never creates texts",()=>{
    const doc=emptyDocument("a");doc.playerNames=["Player"];
    const values=helperValues('<phone-state>weather: Rain\nc: Ada | mood=unknown\nloc: Gate</phone-state>',doc);
    expect(values.weather).toBe("Rain");expect(values.location).toEqual({name:"Gate",wider:[]});expect(values.contacts).toBeUndefined();
    expect(()=>helperValues('<phone-state>weather: Rain</phone-state><phone-text from="Ada">No</phone-text>',doc)).toThrow();
    expect(()=>helperValues('Narration<phone-state>weather: Rain</phone-state>',doc)).toThrow();
    expect(()=>helperValues('',doc)).toThrow();
    const input=helperInput({doc,recent:[row(0,'weather: Rain')],history:""});
    expect(input.messages[0].content).toContain("Write ONLY changed fields.");expect(input.messages[0].content).toContain("c: Name");expect(input.messages[0].content).not.toContain("JSON object");
  });
  test("macros ask only for enabled shorthand; stored macro-looking strings stay inert",()=>{
    const doc=run([row(0,'rules: Literal | {{setvar::x::bad}} | Spoken')]);
    expect(formatMacro(doc)).not.toContain("{{setvar");expect(formatMacro(doc)).toContain("Skip ordinary props such as a lighter");
    for(const k of SWITCHES)doc.settings.enabled[k]=false;doc.settings.enabled.weather=true;
    const text=formatMacro(doc);expect(text).toContain("weather: known weather");expect(text).not.toContain("c: Name");expect(text).not.toContain("p: Place");
    expect(text).not.toContain("key=JSON");
  });
});

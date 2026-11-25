import { expect, test } from "bun:test";
import { emptyDocument } from "../src/model";
import {
  MACRO_DESCRIPTIONS,
  MACRO_NAMES,
  contactsMacro,
  formatMacro,
  registerPhoneMacros,
  registerPhoneMacroTemplates,
  renderMacro,
  rulesMacro,
  stateMacro,
} from "../src/phone-macros";

function sampleDoc() {
  const doc = emptyDocument("chat-1");
  doc.trackingEnabled = true;
  doc.settings.apps.Messages = true;
  doc.settings.apps.Email = true;
  doc.settings.enabled["contacts.mood"] = true;
  doc.settings.enabled["contacts.thoughts"] = true;
  doc.state.scene.location = { value: { name: "Exam Room Three", wider: ["SR Registry Annex"] }, by: "ai", inferred: false, at: { id: "m1", index: 0, variant: "[0,null]" } };
  doc.state.scene.present = { value: ["Poppy Ericson", "DRAM Matron"], by: "ai", inferred: false, at: { id: "m1", index: 0, variant: "[0,null]" } };
  doc.state.contacts = [
    {
      name: "Poppy Ericson",
      player: true,
      fields: {
        physical: { value: "healthy", by: "ai", inferred: false, at: { id: "m1", index: 0, variant: "[0,null]" } },
        position: { value: "standing", by: "ai", inferred: false, at: { id: "m1", index: 0, variant: "[0,null]" } },
        attire: { value: { worn: ["collar"], removed: ["white dress"] }, by: "ai", inferred: false, at: { id: "m1", index: 0, variant: "[0,null]" } },
      },
      info: { name: "Poppy Ericson", kind: "Main", locked: false, phone: "555-0101", email: "", relationship: "Player", details: [] },
    },
    {
      name: "Graham Purcell",
      player: false,
      fields: {
        roles: { value: ["Handler"], by: "ai", inferred: false, at: { id: "m1", index: 0, variant: "[0,null]" } },
        physical: { value: "tired", by: "ai", inferred: false, at: { id: "m1", index: 0, variant: "[0,null]" } },
        position: { value: "in hallway", by: "ai", inferred: false, at: { id: "m1", index: 0, variant: "[0,null]" } },
        mood: { value: "tense", by: "ai", inferred: false, at: { id: "m1", index: 0, variant: "[0,null]" } },
        thoughts: { value: "worried about inspection", by: "ai", inferred: false, at: { id: "m1", index: 0, variant: "[0,null]" } },
      },
      info: { name: "Graham Purcell", kind: "Main", locked: false, phone: "555-0102", email: "", relationship: "Ally", details: [] },
    },
    {
      name: "Offscreen Guard",
      player: false,
      fields: {
        roles: { value: ["Guard"], by: "ai", inferred: false, at: { id: "m1", index: 0, variant: "[0,null]" } },
        mood: { value: "bored", by: "ai", inferred: false, at: { id: "m1", index: 0, variant: "[0,null]" } },
      },
      info: { name: "Offscreen Guard", kind: "NPC", locked: false, phone: "", email: "", relationship: "", details: [] },
    },
  ];
  return doc;
}

test("phone_state and phone_rules cleanly split continuity from instructions while phone_format combines both", () => {
  const doc = sampleDoc();
  const state = stateMacro(doc);
  const rules = rulesMacro(doc);
  const combined = formatMacro(doc);

  expect(state).toContain("Exam Room Three");
  expect(state).not.toContain("<phone-state>");

  expect(rules).toContain("<phone-state>");
  expect(rules).not.toContain("Exam Room Three");

  expect(combined).toBe([state, rules].join("\n"));
  expect(renderMacro("phone_state", doc)).toBe(state);
  expect(renderMacro("phone_rules", doc)).toBe(rules);
});

test("phone_contacts gives full detail in-scene, compact summary for off-screen Main contacts, and omits off-screen minor NPCs", () => {
  const doc = sampleDoc();
  const out = contactsMacro(doc);

  // In-scene contact includes full enabled fields
  expect(out).toContain("Poppy Ericson (You):");
  expect(out).toContain("physical=healthy");
  expect(out).toContain("position=standing");

  // Off-screen Main contact gets compact summary only (no transient position/mood/thoughts/physical)
  expect(out).toContain("Graham Purcell (off-scene):");
  expect(out).toContain("relationship=Ally");
  expect(out).toContain("roles=Handler");
  expect(out).not.toContain("in hallway");
  expect(out).not.toContain("worried about inspection");
  expect(out).not.toContain("mood=tense");

  // Off-screen minor NPC is omitted to save tokens
  expect(out).not.toContain("Offscreen Guard");
});

test("every registered macro has a plain-English description and works via template interceptor", async () => {
  const doc = sampleDoc();
  const defs: Array<{ name: string; description?: string }> = [];
  let interceptor: ((ctx: any) => Promise<any>) | undefined;
  const api = {
    permissions: { has: () => true },
    log: { warn: () => {} },
    registerMacro: (def: { name: string; description?: string }) => { defs.push(def); },
    registerMacroInterceptor: (fn: (ctx: any) => Promise<any>) => { interceptor = fn; },
  } as any;

  registerPhoneMacros(api, async () => doc);
  registerPhoneMacroTemplates(api, async () => doc);

  expect(defs.map(d => d.name)).toEqual([...MACRO_NAMES]);
  for (const def of defs) {
    expect(def.description).toBe(MACRO_DESCRIPTIONS[def.name as keyof typeof MACRO_DESCRIPTIONS]);
    expect(def.description).not.toContain("Chat-specific");
  }

  const res = await interceptor!({
    template: "TOP:\n{{phone_state}}\nCONTACTS:\n{{phone_contacts}}\nBOTTOM:\n{{phone_rules}}",
    userId: "u",
    env: { chat: { id: "chat-1" }, dynamicMacros: {} },
  });
  expect(res.text).toContain("Exam Room Three");
  expect(res.text).toContain("Graham Purcell (off-scene):");
  expect(res.text).toContain("<phone-state>");
});

test("new macros obey app/field switches and never evaluate stored native macros",()=>{
 const doc=sampleDoc();
 doc.state.contacts[0].fields.physical!.value="hidden physical";doc.settings.enabled["contacts.physical"]=false;
 expect(contactsMacro(doc)).not.toContain("hidden physical");
 doc.state.contacts[0].info!.relationship="{{setvar::private::bad}}";
 expect(contactsMacro(doc)).not.toContain("{{");
 doc.settings.apps.Contacts=false;expect(contactsMacro(doc)).toBe("");
 for(const key of Object.keys(doc.settings.enabled))doc.settings.enabled[key]=false;
 for(const name of MACRO_NAMES)expect(renderMacro(name,doc)).toBe("");
 doc.trackingEnabled=false;for(const name of MACRO_NAMES)expect(renderMacro(name,doc)).toBe("");
});
test("new pull macros use trusted user/chat context, with personal wording for rules only",async()=>{
 const defs=new Map<string,any>();let loads=0;const wordingUsers:string[]=[];
 const api={permissions:{has:()=>true},log:{warn:()=>{}},registerMacro:(def:any)=>defs.set(def.name,def)};
 const load=async(chat:string,user:string)=>{loads++;expect(chat).toBe("chat-1");expect(["u","v"]).toContain(user);return sampleDoc();};
 registerPhoneMacros(api as any,load,async user=>{wordingUsers.push(user);return `Personal wording ${user} [[phone_syntax]]`;});
 for(const name of ["phone_state","phone_rules","phone_contacts"]){
  expect(await defs.get(name).handler({env:{chat:{id:"chat-1"}}})).toBe("");
  expect(await defs.get(name).handler({userId:"u"})).toBe("");
  expect(await defs.get(name).handler({userId:"u",env:{chat:{id:"chat-1"},extra:{userId:"v"}}})).toBe("");
 }
 expect(loads).toBe(0);
 const context=(user:string)=>({env:{chat:{id:"chat-1"},extra:{userId:user}}});
 expect(await defs.get("phone_rules").handler(context("u"))).toContain("Personal wording u");
 expect(await defs.get("phone_rules").handler(context("v"))).toContain("Personal wording v");
 const data=await defs.get("phone_state").handler(context("u"));expect(data).toContain("Exam Room Three");expect(data).not.toContain("Personal wording");expect(wordingUsers).toEqual(["u","v"]);
});
test("all registered continuity names resolve in one interceptor snapshot without replacing a dynamic override",async()=>{
 let interceptor:any;let loads=0;
 const api={permissions:{has:()=>true},log:{warn:()=>{}},registerMacroInterceptor:(handler:any)=>{interceptor=handler;}};
 registerPhoneMacroTemplates(api as any,async()=>{loads++;return sampleDoc();});
 const template=MACRO_NAMES.map(n=>`{{${n}}}`).join("\n");
 const result=await interceptor({template,userId:"u",env:{chat:{id:"chat-1"},dynamicMacros:{}}});
 expect(loads).toBe(1);for(const name of MACRO_NAMES)expect(result.text).not.toContain(`{{${name}}}`);
 const override=await interceptor({template:"{{phone_rules}} {{phone_state}}",userId:"u",env:{chat:{id:"chat-1"},dynamicMacros:{phone_rules:"Host value"}}});
 expect(override.text).toContain("{{phone_rules}}");expect(override.text).not.toContain("{{phone_state}}");
});
test("continuity-only state includes a personal Misc note without requiring a writable tracker field",()=>{
 const doc=sampleDoc();for(const k of Object.keys(doc.settings.enabled))doc.settings.enabled[k]=false;
 doc.settings.enabled["notes.misc"]=true;
 doc.state.notes.misc=[{name:"Reminder",detail:"Bring the map",context:"",sendToAI:true,resolved:false,by:"user",addedByUser:true,updated:false,at:{id:"m1",index:0,variant:""}}];
 expect(stateMacro(doc)).toContain("Bring the map");expect(rulesMacro(doc)).toBe("");
});

test("contact continuity keeps confirmed NPC detail, fake labels, escaping and a bounded output",()=>{
 const doc=sampleDoc();const npc=doc.state.contacts[2];
 (doc.state.scene.present!.value as string[]).push(npc.name);
 npc.info!.phone="555-0112";npc.info!.fakeFields=["phone"];
 npc.info!.details=[{label:"Guide",value:"{{user}} knows the road"}];
 const text=contactsMacro(doc);expect(text).toContain("phone=555-0112 [made up]");expect(text).toContain("Guide=");expect(text).not.toContain("{{user}}");
 doc.state.contacts=Array.from({length:30},(_,i)=>{const c=structuredClone(doc.state.contacts[1]);c.name=`Main ${i}`;c.info!.name=c.name;c.info!.phone="1".repeat(100);c.info!.email="a".repeat(150);c.info!.relationship="r".repeat(100);return c;});
 expect(contactsMacro(doc).length).toBeLessThanOrEqual(4400);
});

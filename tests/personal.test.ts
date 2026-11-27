import {expect,test} from "bun:test";
import {PersonalStore,emptyPersonal,presetSnapshot,builtInPresets,validatePreset,selectedWording,SYNTAX_TOKEN,readPersonal} from "../src/personal-settings";
import {defaults,emptyDocument,ALL_APPS,SWITCHES} from "../src/model";
import {formatMacro,registerPhoneMacros,registerPhoneMacroTemplates,defaultWordingTemplate,trackerInstructions} from "../src/phone-macros";
import {composeWording,HELPER_SAFETY,syntaxLine} from "../src/wording";
import {helperInput,helperValues} from "../src/helper";
import {PhoneStore} from "../src/phone-store";
const fixture=()=>{const files=new Map<string,unknown>(),warnings:string[]=[];const calls:string[]=[];const store=new PersonalStore({read:async u=>{if(!u)throw Error("userId is required for operator-scoped extensions");calls.push(u);return structuredClone(files.get(u)??emptyPersonal());},write:async(u,v)=>{if(!u)throw Error("userId is required for operator-scoped extensions");calls.push(u);files.set(u,structuredClone(v));},warn:s=>warnings.push(s)});return {store,files,warnings,calls};};
test("profiles store the two explicit AI permissions but never source, inference or appearance",()=>{
 const s=defaults();s.source="helper";s.connection_id="private";s.helperMessages=9;s.aiPlayerTexts=true;s.inferMissing=true;
 const snap=presetSnapshot(s);expect(Object.keys(snap).sort()).toEqual(["apps","enabled","notesPerSection","logLines","keepTrackers","keepTexts","aiPlayerTexts","allowAIUserEdits"].sort());expect(validatePreset(snap)).toEqual(snap);
 for(const forbidden of ["source","connection_id","helperMessages","inferMissing","css","dismissed","state","wordings"])expect(()=>validatePreset({...snap,[forbidden]:true})).toThrow();
 const builtins=builtInPresets();expect(builtins[0].settings).toEqual(presetSnapshot(defaults()));expect(ALL_APPS.filter(a=>builtins[1].settings.apps[a])).toEqual(["Scene","Weather","Messages"]);builtins[0].settings.apps.Scene=false;expect(builtInPresets()[0].settings.apps.Scene).toBe(true);
});
test("personal preset CRUD is per user, caps names/count, rejects built-in and stale writes",async()=>{
 const {store}=fixture();let p=await store.update("a",0,{kind:"preset_save",name:"My setup"},defaults());expect((await store.read("b")).presets).toEqual([]);
 const id=p.presets[0].id;p=await store.update("a",p.revision,{kind:"preset_rename",id,name:"Renamed"});expect(p.presets[0].name).toBe("Renamed");await expect(store.update("a",0,{kind:"preset_delete",id})).rejects.toThrow();
 for(const id of ["default","minimal"])for(const kind of ["preset_delete","preset_rename"])await expect(store.update("a",p.revision,{kind,id,name:"Oops"})).rejects.toThrow();
 await expect(store.update("a",p.revision,{kind:"preset_save",name:"x".repeat(41)},defaults())).rejects.toThrow();
 p=await store.update("a",p.revision,{kind:"preset_delete",id});for(let i=0;i<20;i++)p=await store.update("a",p.revision,{kind:"preset_save",name:`Preset ${i}`},defaults());await expect(store.update("a",p.revision,{kind:"preset_save",name:"Overflow"},defaults())).rejects.toThrow();await expect(store.read("")).rejects.toThrow();
});
test("preset application pins chat, preserves story and every excluded setting",async()=>{
 const docs=new Map<string,string>();let paid=0;const store=new PhoneStore({authorize:async(c,u)=>["u","v"].includes(u)&&["a","b"].includes(c),read:async c=>docs.get(c)??JSON.stringify(emptyDocument(c)),write:async(c,s)=>{docs.set(c,s);},history:async c=>[{id:c+"1",chat_id:c,index_in_chat:0,role:"assistant",content:"<phone-state>weather: Rain</phone-state>",swipe_id:0}],player:async()=>"Player"});
 let a=await store.sync("u","a");const b=await store.sync("v","b");a=await store.update("u","a",a.revision,{settings:{source:"helper",connection_id:"conn",helperMessages:7,aiPlayerTexts:true,inferMissing:true}});const before=structuredClone(a);
 a=await store.update("u","a",a.revision,{settings:builtInPresets()[1].settings});expect(a.settings.aiPlayerTexts).toBe(false);expect(a.settings.allowAIUserEdits).toBe(false);expect(a.state).toEqual(before.state);expect(a.accepted).toEqual(before.accepted);for(const k of ["source","connection_id","helperMessages","inferMissing"] as const)expect(a.settings[k]).toBe(before.settings[k]);expect(await store.preview("b","v")).toEqual(b);expect((await store.preview("a","v")).settings).toEqual(a.settings);expect(paid).toBe(0);
});
test("wordings are personal, capped at ten total and Default cannot be edited/deleted",async()=>{
 const {store}=fixture();let p=await store.update("u",0,{kind:"wording_save",target:"main",name:"Simple",text:`Use short lines. ${SYNTAX_TOKEN}`});expect(selectedWording(p,"main")).toContain("short");expect(selectedWording(await store.read("v"),"main")).toBeUndefined();expect(selectedWording(p,"helper")).toBeUndefined();
 await expect(store.update("u",p.revision,{kind:"wording_save",target:"main",id:"default",name:"Overwrite",text:"Bad"})).rejects.toThrow();await expect(store.update("u",p.revision,{kind:"wording_delete",target:"helper",id:"default"})).rejects.toThrow();
 for(let i=1;i<10;i++)p=await store.update("u",p.revision,{kind:"wording_save",target:i%2?"helper":"main",name:`Wording ${i}`,text:SYNTAX_TOKEN});await expect(store.update("u",p.revision,{kind:"wording_save",target:"helper",name:"Overflow",text:SYNTAX_TOKEN})).rejects.toThrow();
});
test("bad wording falls back and reset succeeds without exposing text in warnings",async()=>{
 const {store,warnings,files}=fixture();let p=await store.update("u",0,{kind:"wording_save",target:"main",name:"Good",text:SYNTAX_TOKEN});for(const text of ["", "private story".repeat(400)]){p=await store.update("u",p.revision,{kind:"wording_save",target:"main",id:p.wordings.main[0].id,name:"Good",text});expect(p.selected.main).toBe("default");}
 expect(warnings.every(s=>!s.includes("private story"))).toBe(true);const corrupted=structuredClone(p);corrupted.selected.main=corrupted.wordings.main[0].id;corrupted.wordings.main[0].text="x".repeat(4001);files.set("u",corrupted);expect((await store.read("u")).selected.main).toBe("default");p=await store.read("u");p=await store.update("u",p.revision,{kind:"wording_select",target:"main",id:"default"});expect(p.selected.main).toBe("default");const staleReset=await store.update("u",0,{kind:"wording_select",target:"main",id:"default"});expect(staleReset.selected.main).toBe("default");
});
test("custom syntax is generated intact, once, and app sections are filtered",()=>{
 const doc=emptyDocument("a");doc.settings.apps.Calls=true;const custom=`Please track carefully.\n${SYNTAX_TOKEN}\n[Calls]\nCALL WORDING\n[Weather]\nWEATHER WORDING\n[Email]\nEMAIL WORDING`;
 const output=formatMacro(doc,custom);for(const line of trackerInstructions(doc).filter(syntaxLine))expect(output).toContain(line);expect(output).toContain("CALL WORDING");expect(output).not.toContain("EMAIL WORDING");doc.settings.apps.Calls=false;doc.settings.apps.Weather=false;const off=formatMacro(doc,custom);expect(off).not.toContain("CALL WORDING");expect(off).not.toContain("WEATHER WORDING");expect(off).not.toContain("call:");expect(off).not.toContain("weather:");
 const warnings:string[]=[];const appended=formatMacro(doc,"Use changed facts.",s=>warnings.push(s));expect(appended).toContain("loc:");expect(warnings).toHaveLength(1);const twice=formatMacro(doc,SYNTAX_TOKEN+SYNTAX_TOKEN);expect(twice.match(/loc: Place/g)).toHaveLength(1);expect(formatMacro(doc,"{{phone_format}} "+SYNTAX_TOKEN)).toContain("{ {phone_format} }");
 expect(formatMacro(doc,"",s=>warnings.push(s))).toBe(formatMacro(doc));expect(formatMacro(doc,"x".repeat(4001))).toBe(formatMacro(doc));
 doc.settings.enabled.messages=false;expect(formatMacro(doc,custom+"\n[Messages]\nDISABLED TEXT WORDING")).not.toContain("DISABLED TEXT WORDING");doc.settings.enabled.messages=true;doc.settings.source="helper";const mainHelper=formatMacro(doc,custom+"\n[Contacts]\nCONTACT WORDING");expect(mainHelper).not.toContain("CONTACT WORDING");expect(mainHelper).not.toContain("loc: Place");expect(mainHelper).toContain("Do not write a phone-state block");
});
test("Helper custom text never removes locked safety or call attribution syntax",()=>{
 const doc=emptyDocument("a");doc.settings.apps.Calls=true;const ticket={doc,recent:[],history:""};const text=String(helperInput(ticket,"My extraction wording. "+SYNTAX_TOKEN).messages[0].content);expect(text).toContain(HELPER_SAFETY);expect(text).toContain('"source":"exact recent message id"');expect(text).not.toContain("<phone-text");expect(text).not.toContain("<phone-email");expect(()=>helperValues('<phone-text from="Ada">No</phone-text>',doc)).toThrow();expect(()=>helperValues('<phone-email from="Ada">No</phone-email>',doc)).toThrow();
});
test("preview rendering equals pull/interceptor output for the generating user's wording",async()=>{
 const doc=emptyDocument("a"),{store}=fixture();await store.update("u",0,{kind:"wording_save",target:"main",name:"Mine",text:"ONLY U "+SYNTAX_TOKEN});await store.update("v",0,{kind:"wording_save",target:"main",name:"Mine",text:"ONLY V "+SYNTAX_TOKEN});const handlers=new Map<string,(ctx:any)=>Promise<string>>();let interceptor:any;const api={registerMacro:(def:any)=>handlers.set(def.name,def.handler),registerMacroInterceptor:(fn:any)=>interceptor=fn,permissions:{has:()=>true},log:{warn:()=>{}}} as any;const wording=async(u:string)=>selectedWording(await store.read(u),"main");registerPhoneMacros(api,async()=>structuredClone(doc),wording);registerPhoneMacroTemplates(api,async()=>structuredClone(doc),wording);
 for(const user of ["u","v"]){const preview=formatMacro(doc,await wording(user));expect(await handlers.get("phone_format")!({userId:user,chatId:"a",commit:false})).toBe(preview);expect((await interceptor({userId:user,template:"{{phone_format}}",env:{chat:{id:"a"}}})).text).toBe(preview);expect(preview).toContain(user==="u"?"ONLY U":"ONLY V");expect(preview).not.toContain(user==="u"?"ONLY V":"ONLY U");}
 expect(defaultWordingTemplate(doc).length).toBeLessThanOrEqual(4000);expect(defaultWordingTemplate(doc,true).length).toBeLessThanOrEqual(4000);expect(defaultWordingTemplate(doc)).toContain(SYNTAX_TOKEN);
});


test("profile AI permissions round-trip as both on and off, with legacy profiles preserving current choices",async()=>{
 const f=fixture();const settings=defaults();settings.aiPlayerTexts=true;settings.allowAIUserEdits=true;
 let personal=await f.store.update("u",0,{kind:"preset_save",name:"Permission profile"},settings);let saved=(await f.store.read("u")).presets[0].settings;expect(saved.aiPlayerTexts).toBe(true);expect(saved.allowAIUserEdits).toBe(true);expect((await f.store.read("v")).presets).toHaveLength(0);
 settings.aiPlayerTexts=false;settings.allowAIUserEdits=false;personal=await f.store.update("u",personal.revision,{kind:"preset_save",name:"Permissions off"},settings);saved=(await f.store.read("u")).presets[1].settings;expect(saved.aiPlayerTexts).toBe(false);expect(saved.allowAIUserEdits).toBe(false);
 const legacy=presetSnapshot(defaults());delete legacy.aiPlayerTexts;delete legacy.allowAIUserEdits;expect(validatePreset(legacy)).toEqual(legacy);const migrated=readPersonal({presets:[{id:"old",name:"Old profile",settings:legacy}]});expect(migrated.presets).toHaveLength(1);expect(migrated.presets[0].settings).not.toHaveProperty("aiPlayerTexts");expect(migrated.presets[0].settings).not.toHaveProperty("allowAIUserEdits");
 for(const key of ["aiPlayerTexts","allowAIUserEdits"])for(const invalid of ["true",null,1])expect(()=>validatePreset({...legacy,[key]:invalid})).toThrow();
});

test("applying saved AI permissions affects only the pinned chat without changing story or making model calls",async()=>{
 const docs=new Map<string,string>();const store=new PhoneStore({authorize:async(c,u)=>["a","b"].includes(c)&&u==="u",read:async c=>docs.get(c)??JSON.stringify(emptyDocument(c)),write:async(c,s)=>{docs.set(c,s);},history:async c=>[{id:c+"-1",chat_id:c,index_in_chat:0,role:"assistant",swipe_id:0,content:"<phone-state>time: Evening</phone-state>"}],player:async()=>"Player"});
 let a=await store.sync("u","a");const b=await store.sync("u","b"),before=structuredClone(a.state);const profile=presetSnapshot(defaults());profile.aiPlayerTexts=true;profile.allowAIUserEdits=true;a=await store.update("u","a",a.revision,{settings:profile});expect(a.settings.aiPlayerTexts).toBe(true);expect(a.settings.allowAIUserEdits).toBe(true);expect(a.state).toEqual(before);expect((await store.preview("b","u")).settings).toEqual(b.settings);
 const legacy={...profile};delete legacy.aiPlayerTexts;delete legacy.allowAIUserEdits;a=await store.update("u","a",a.revision,{settings:validatePreset(legacy)});expect(a.settings.aiPlayerTexts).toBe(true);expect(a.settings.allowAIUserEdits).toBe(true);
 profile.aiPlayerTexts=false;profile.allowAIUserEdits=false;a=await store.update("u","a",a.revision,{settings:profile});expect(a.settings.aiPlayerTexts).toBe(false);expect(a.settings.allowAIUserEdits).toBe(false);expect(a.state).toEqual(before);
});

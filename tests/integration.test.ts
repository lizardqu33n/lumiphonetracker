import {activityReceipt} from "../src/activity";
import { expect, test } from "bun:test";
import { emptyDocument, SWITCHES } from "../src/model";
import type { SpindleAPI } from "lumiverse-spindle-types";

test("actual backend: render/prompt hooks, scoped receipts, Main AI safety and explicit Helper AI", async () => {
  let processor: Parameters<SpindleAPI["registerMessageContentProcessor"]>[0] | undefined;
  let interceptor: Parameters<SpindleAPI["registerInterceptor"]>[0] | undefined;
  let macroInterceptor: Parameters<SpindleAPI["registerMacroInterceptor"]>[0] | undefined;
  const capabilities: string[] = []; const events: string[] = [];
  const handlers=new Map<string,(payload:unknown,userId?:string)=>void>();const generations:Record<string,unknown>[]=[];
  const persisted = new Map<string, unknown>();
  let receive!: (payload: unknown, userId: string) => void;
  let deliver: (p: Record<string, unknown>, user: string) => void = () => {};
  let registrationOptions: unknown;
  const calls: string[] = []; const warnings: string[] = [];
  let failReads = false;let failReceipts=false;let setupMode=false;
  const scoped = (user: unknown, method: string) => {
    if (typeof user !== "string" || !user.trim()) throw new Error("userId is required for operator-scoped extensions");
    calls.push(method);
  };
  const macros = new Map<string, (ctx: Record<string, unknown>) => Promise<string>>();
  const fake = {
    registerMacro: (definition: {name:string;handler:(ctx:Record<string,unknown>)=>Promise<string>}) => { macros.set(definition.name,definition.handler); },
    variables: { chat: {
      get: async (chat: string, key: string) => { if(failReads)throw new Error("PRIVATE story/field value"); return String(persisted.get(`${chat}/${key}`) ?? ""); },
      set: async (chat: string, key: string, value: string) => { persisted.set(`${chat}/${key}`, value); },
    } },
    macros: { resolve: async (_text:string, options?:{userId?:string;commit?:boolean}) => { scoped(options?.userId,"macros.resolve"); expect(options?.commit).toBe(false); return { text: "Player", diagnostics: [] }; } },
    host: { capabilities: { "required-interceptors-v1": 1 } },
    frontendCapabilities: { declare: (name: string) => { capabilities.push(name); return () => {}; } },
    permissions: { has: () => true, onChanged: () => () => {} },
    registerMessageContentProcessor: (handler: typeof processor) => { processor = handler; },
    registerMacroInterceptor: (handler: typeof macroInterceptor) => { macroInterceptor=handler; },
    registerInterceptor: (handler: typeof interceptor, options: unknown) => { interceptor = handler; registrationOptions = options; },
    onFrontendMessage: (fn: typeof receive) => { receive = fn; return () => {}; },
    on: (event: string,fn:(payload:unknown,userId?:string)=>void) => { events.push(event);handlers.set(event,fn); return () => {}; },
    connections:{list:async(user:string)=>{scoped(user,"connections.list");return [{id:user==="v"?"v-small":"small",name:"Existing profile",model:"Test model"}];}},
    generate:{raw:async(input:Record<string,unknown>)=>{scoped(input.userId,"generate.raw");generations.push(input);return {content:setupMode?JSON.stringify({contacts:[{name:"Zoe",phone:"555666",quote:"Zoe is a guide. Her phone is 555666."}]}):"{}",finish_reason:"stop"};}},
    chats: { get: async (id: string, user: string) => {scoped(user,"chats.get");return (user === "u" && id !== "c") || (user === "v" && id === "c") ||(id==="shared"&&["u","v"].includes(user)) ? { id,character_id:"card" } : null;}, getActive: async (user:string) => {scoped(user,"chats.getActive");return { id: "a" };} },
    chat: { getMessages: async (chat: string) => chat === "empty" ? [] : [{ id: "m1", chat_id: chat, index_in_chat: 0, role: "assistant", content:chat==="shared"?'Main account has $500.<phone-state>\ncall: Ada | missed\nbank: Main | $500\n</phone-state><phone-email from="Ada" subject="Shared plan">Meet at dusk.</phone-email>': `<phone-state>location="${chat}"</phone-state><phone-text from="Ada">Actual saved test text</phone-text>`, swipe_id: 0 }] },
    userStorage: {
      exists: async (path: string, user: string) => {scoped(user,"userStorage.exists");return persisted.has(`${user}/${path}`);},
      read: async (path: string, user: string) => {scoped(user,"userStorage.read");return JSON.stringify(persisted.get(`${user}/${path}`));},
      getJson: async (path: string, options: { userId: string; fallback: unknown }) => {scoped(options?.userId,"userStorage.getJson");if(failReceipts&&path.startsWith("message-reads/"))throw Error("PRIVATE receipt failure");return structuredClone(persisted.get(`${options.userId}/${path}`) ?? options.fallback);},
      setJson: async (path: string, value: unknown, options: { userId: string }) => { scoped(options?.userId,"userStorage.setJson");persisted.set(`${options.userId}/${path}`, value); },
    },
    sendToFrontend: (p: Record<string, unknown>, user: string) => { scoped(user,"sendToFrontend");deliver(p,user); },
    log: { info: () => {}, warn: (text:string) => {warnings.push(text);} },
  };
  const prior = (globalThis as unknown as { spindle?: unknown }).spindle;
  (globalThis as unknown as { spindle: unknown }).spindle = fake;
  try {
    await import(`../src/backend.ts?test=${crypto.randomUUID()}`);
    expect(capabilities).toEqual(["message_tag_interceptor"]);
    expect(() => scoped(undefined,"mock self-check")).toThrow("userId is required for operator-scoped extensions");
    expect(events).toContain("GENERATION_ENDED");
    expect(registrationOptions).toBe(1000);
    expect(macroInterceptor).toBeDefined();
    expect(processor).toBeDefined(); expect(interceptor).toBeDefined();
    const base = { chatId: "a", content: 'Story<phone-state>location="Hidden"', isUser: false, userId: "u" };
    for (const origin of ["create", "update", "swipe_add", "swipe_update"] as const) {
      expect(await processor!({ ...base, origin })).toBeUndefined();
    }
    expect(await processor!({ ...base, origin: "render" })).toEqual({ content: "Story" });
    const input = [{ role: "assistant" as const, __isChatHistory: true, content: 'Story<phone-state>location="Hidden"</phone-state>' }];
    const output = await interceptor!(input, {chatId:"a",userId:"u",isDryRun:true} as never);
    expect(output).toEqual([{ ...input[0], content: "Story" }]);
    expect(input[0].content).toContain("phone-state");
    // Dry Run and normal replies use the same read-only, explicitly scoped path.
    expect(await interceptor!(input,{chatId:"a",userId:"u",isDryRun:false} as never)).toEqual(output);
    const beforeReads = calls.length;
    for (const context of [{},{chatId:"a"},{userId:"u"},{chatId:"a",userId:" "},null]) {
      expect(await interceptor!(input,context as never)).toBe(input);
    }
    expect(calls.length).toBe(beforeReads);
    expect(await interceptor!(input,{chatId:"a",userId:"other-user"} as never)).toBe(input);
    // Realistic pull RPC: no top-level user identity. No guessed chat or unscoped call.
    const missingPull=await macros.get("phone_format")!({commit:false,env:{chat:{id:"a"}}});
    expect(missingPull).toBe("");expect(warnings.at(-1)).toBe("Lumi Phone Tracker: phone_format empty: no userId.");
    expect(await macros.get("phone_format")!({commit:false,userId:"u"})).toBe("");
    expect(warnings.at(-1)).toBe("Lumi Phone Tracker: phone_format empty: no chat.");
    const templateContext=(chat:string,user="u",commit=false)=>({template:"{{phone_format}}",userId:user,commit,phase:"prompt",env:{chat:{id:chat},dynamicMacros:{}}} as never);
    const renderTemplate=async(chat:string,user="u",commit=false)=>{
      const result=await macroInterceptor!(templateContext(chat,user,commit));
      return typeof result==="string"?result:result?.text??"";
    };
    // Same macro evaluator hook in preview and committing generation, no saved tracker required.
    const beforeEmpty=[...persisted.entries()];
    expect(await renderTemplate("empty")).toContain("End each reply with <phone-state>");
    expect(await renderTemplate("empty","u",true)).toContain("End each reply with <phone-state>");
    expect([...persisted.entries()]).toEqual(beforeEmpty);
    const empty=emptyDocument("empty");for(const key of SWITCHES)empty.settings.enabled[key]=false;empty.settings.enabled.weather=true;
    persisted.set("empty/lpt_phone_v2",JSON.stringify(empty));
    const weatherOnly=await renderTemplate("empty");expect(weatherOnly).toContain('weather: known weather');expect(weatherOnly).not.toContain('location={');
    persisted.delete("empty/lpt_phone_v2");
    const [a,c]=await Promise.all([renderTemplate("a"),renderTemplate("c","v")]);
    expect(a).toContain('location: a');expect(a).not.toContain('location: c');expect(c).toContain('location: c');expect(c).not.toContain('location: a');
    expect(await renderTemplate("a","v")).toBe("");
    expect(calls).not.toContain("chats.getActive");
    // Native preset assembly uses sourceOwner:"host": the macro interceptor is bypassed.
    // Match the actual pull RPC payload, with no top-level userId.
    for(const commit of [false,true]) {
      const pull={commit,chatId:"a",env:{chat:{id:"a"},extra:{userId:"u"},variables:{chat:{}}}};
      const text=await macros.get("phone_format")!(pull);
      expect(text).toContain("End each reply with <phone-state>");
      expect(text).toContain("location: a");
    }
    const nativePull=(chat:string,user:string)=>macros.get("phone_format")!({commit:false,env:{chat:{id:chat},extra:{userId:user}}});
    const beforePreset=[...persisted.entries()];
    expect(await nativePull("empty","u")).toContain("End each reply with <phone-state>");
    const [presetA,presetC]=await Promise.all([nativePull("a","u"),nativePull("c","v")]);
    expect(presetA).toContain("location: a");expect(presetA).not.toContain("location: c");
    expect(presetC).toContain("location: c");expect(presetC).not.toContain("location: a");
    expect(await nativePull("a","v")).toBe("");expect([...persisted.entries()]).toEqual(beforePreset);
    const beforePreview = [...persisted.entries()];
    for (const handler of macros.values()) {
      for (const context of [{},{chatId:"a"},{userId:"u"},{chatId:"a",userId:" "}]) { const count=calls.length; expect(await handler(context)).toBe(""); expect(calls.length).toBe(count); }
      expect(await handler({chatId:"a",userId:"other-user",commit:false})).toBe("");
      expect(typeof await handler({chatId:"a",userId:"u",commit:false})).toBe("string");
    }
    expect(await macros.get("phone_scene")!({chatId:"a",userId:"u",commit:false})).toContain("location:");
    expect([...persisted.entries()]).toEqual(beforePreview);
    failReads=true;
    expect(await renderTemplate("a")).toBe("");
    expect(warnings.at(-1)).toBe("Lumi Phone Tracker: phone_format empty: extension setting.");
    expect(await interceptor!(input,{chatId:"a",userId:"u"} as never)).toBe(input);
    expect(await macros.get("phone_format")!({chatId:"a",userId:"u"})).toBe("");
    failReads=false;
    const logger=fake.log.warn; fake.log.warn=()=>{throw new Error("logger unavailable");};
    expect(await interceptor!(input,{} as never)).toBe(input);
    expect(await macros.get("phone_format")!({chatId:"a"})).toBe("");
    fake.log.warn=logger;
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.join("\n")).not.toContain("PRIVATE");
    expect(warnings.join("\n")).not.toContain("Hidden");
    expect(generations).toHaveLength(0);
    // A missing host identity cannot be substituted by a claimed payload identity.
    const beforeMissingUser=calls.length;
    receive({type:"phone_preferences_update",requestId:"missing",change:{css:""},userId:"u"},undefined as never);
    receive({type:"phone_sync",requestId:"missing",chatId:"a",userId:"u"},undefined as never);
    receive({type:"phone_helper_now",requestId:"missing-helper",chatId:"a",userId:"u"},undefined as never);
    expect(warnings.at(-1)).toBe("Lumi Phone Tracker: Helper AI: permission missing.");
    await Bun.sleep(5); expect(calls.length).toBe(beforeMissingUser);
    for (const chatId of ["a", "b"]) {
      const response = new Promise<Record<string, unknown>>(resolve => {
        deliver = (p, user) => { expect(user).toBe("u"); resolve(p); };
      });
      receive({ type: "phone_sync", requestId: chatId, chatId }, "u");
      const result = await response;
      expect(result.type).toBe("phone_snapshot"); expect(result.chatId).toBe(chatId);
      expect((result.snapshot as { state: { scene: { location: { value: { name: string } } } } }).state.scene.location.value.name).toBe(chatId);
    }
    expect(persisted.size).toBe(2);
    for (const event of ["MESSAGE_SENT","MESSAGE_EDITED","MESSAGE_DELETED","MESSAGE_SWIPED","SWIPE_EDITED","CHAT_CHANGED"]) {
      handlers.get(event)!({chatId:"a"},"u");
    }
    await Bun.sleep(15);
    const request = (payload: Record<string, unknown>, user: string) => {
      const id=crypto.randomUUID();
      const response = new Promise<Record<string, unknown>>(resolve => { deliver = (p, target) => { if(p.requestId===id){expect(target).toBe(user); resolve(p);} }; });
      receive({ requestId: id, ...payload }, user); return response;
    };
    const edited = await request({ type: "phone_preferences_update", change: { css: ".lpt-root { --lpt-width: 400px; }", dismiss: "Scene" } }, "u");
    expect(edited.type).toBe("phone_preferences_result");
    expect(edited.preferences).toEqual({ revision: 1, css: ".lpt-root { --lpt-width: 400px; }", dismissed: ["Scene"] });
    const other = await request({ type: "phone_preferences" }, "other-user");
    expect(other.preferences).toEqual({ revision: 0, css: "", dismissed: [] });
    const reset = await request({ type: "phone_preferences_update", change: { css: "" } }, "u");
    expect(reset.preferences).toEqual({ revision: 2, css: "", dismissed: ["Scene"] });
    const uploaded=await request({type:"phone_preferences_update",change:{sidebarCss:".lpt-side-title {color:blue;}"}},"u");expect((uploaded.preferences as any).sidebarCss).toContain("blue");expect(((await request({type:"phone_preferences"},"v")).preferences as any).sidebarCss).toBeUndefined();
    const synced = await request({type:"phone_sync",chatId:"a"},"u");
    const text = (synced.snapshot as {state:{messages:{id:string;from:string;to?:string;time?:string;text:string}[]}}).state.messages[0];
    const observed = [{id:text.id,receipt:JSON.stringify([text.from,text.to??null,text.time??null,text.text])}];
    const marked = await request({type:"phone_mark_read",chatId:"a",key:"ada",observed},"u");
    expect(marked.type).toBe("phone_reads_result"); expect(marked.chatId).toBe("a"); expect((marked.reads as {seen:Record<string,string>}).seen[text.id]).toBe(observed[0].receipt);
    const forbidden = await request({type:"phone_mark_read",chatId:"a",key:"ada",observed},"other-user");
    expect(forbidden.type).toBe("phone_reads_error");
    handlers.get("GENERATION_ENDED")!({chatId:"a",generationId:"main-only",messageId:"m1",content:`<phone-state>location="a"</phone-state><phone-text from="Ada">Actual saved test text</phone-text>`},"u");
    await Bun.sleep(10);expect(generations.length).toBe(0);
    const before=await request({type:"phone_sync",chatId:"a"},"u");
    const selected=await request({type:"phone_update",chatId:"a",revision:(before.snapshot as {revision:number}).revision,settings:{source:"helper",connection_id:"small"}},"u");
    expect((selected.snapshot as {settings:{source:string}}).settings.source).toBe("helper");expect(generations.length).toBe(0);
    const done=await request({type:"phone_helper_now",chatId:"a"},"u");expect(done.type).toBe("phone_helper_now_result");expect(done.result).toEqual({ok:true});expect(generations.length).toBe(1);
    const countBeforeMissingEvent=generations.length;
    handlers.get("GENERATION_ENDED")!({chatId:"a",generationId:"unscoped",messageId:"m1",content:"PRIVATE"});
    await Bun.sleep(10); expect(generations.length).toBe(countBeforeMissingEvent);
    // Also exercise automatic completion through the strict operator host.
    handlers.get("GENERATION_STARTED")!({chatId:"a",generationId:"scoped-auto"},"u");
    
    handlers.get("GENERATION_ENDED")!({chatId:"a",generationId:"scoped-auto",messageId:"m1",content:`<phone-state>location="a"</phone-state><phone-text from="Ada">Actual saved test text</phone-text>`},"u");
    for(let i=0;i<100&&generations.length<2;i++)await Bun.sleep(5);
    expect(generations.length).toBe(2);
    handlers.get("GENERATION_STOPPED")!({chatId:"a",generationId:"stopped-with-user"},"u");
    expect(calls).toContain("userStorage.setJson");expect(calls).toContain("macros.resolve");expect(calls).toContain("chats.get");
    const cBefore=await request({type:"phone_sync",chatId:"c"},"v");
    await request({type:"phone_update",chatId:"c",revision:(cBefore.snapshot as {revision:number}).revision,settings:{source:"helper",connection_id:"v-small"}},"v");
    const cRefresh=await request({type:"phone_helper_now",chatId:"c"},"v");expect(cRefresh.result).toEqual({ok:true});
    expect(generations.at(-1)!.userId).toBe("v");expect(generations.at(-1)!.connection_id).toBe("v-small");
    const cSaved=JSON.parse(String(persisted.get("c/lpt_phone_v2")));expect(cSaved.helperOwner).toBe("v");expect(cSaved.helperEntries.length).toBe(1);
    const cText=(cBefore.snapshot as {state:{messages:{id:string;from:string;to?:string;time?:string;text:string}[]}}).state.messages[0];
    const cObserved=[{id:cText.id,receipt:JSON.stringify([cText.from,cText.to??null,cText.time??null,cText.text])}];
    expect((await request({type:"phone_mark_read",chatId:"c",key:"ada",observed:cObserved},"v")).type).toBe("phone_reads_result");
    expect([...persisted.keys()].some(k=>k.startsWith("v/message-reads/"))).toBe(true);
    const beforeForbidden=generations.length;
    expect((await request({type:"phone_helper_now",chatId:"c"},"u")).category).toBe("permission missing");expect(generations.length).toBe(beforeForbidden);
    const sharedU=await request({type:"phone_sync",chatId:"shared"},"u");
    const sharedAdded=await request({type:"phone_update",chatId:"shared",revision:(sharedU.snapshot as {revision:number}).revision,settings:{apps:{Calls:true,Email:true,Bank:true}}},"v");
    const sharedV=await request({type:"phone_sync",chatId:"shared"},"u");expect((sharedV.snapshot as any).state).toEqual((sharedAdded.snapshot as any).state);expect((sharedV.snapshot as any).settings.apps.Bank).toBe(true);
    const call=(sharedV.snapshot as any).state.calls[0],mail=(sharedV.snapshot as any).state.emails[0];
    for(const [key,entry]of [["@calls",call],["@email",mail]])expect((await request({type:"phone_mark_read",chatId:"shared",key,observed:[{id:entry.id,receipt:activityReceipt(entry)}]},"u")).type).toBe("phone_reads_result");
    const uAfter=await request({type:"phone_sync",chatId:"shared"},"u"),vAfter=await request({type:"phone_sync",chatId:"shared"},"v");expect((uAfter.reads as any).seen[call.id]).toBeDefined();expect((vAfter.reads as any).seen[call.id]).toBeUndefined();expect((uAfter.reads as any).seen[mail.id]).toBeDefined();expect((vAfter.reads as any).seen[mail.id]).toBeUndefined();
    expect(await macros.get("phone_email")!({chatId:"shared",userId:"u"})).toBe("");expect(await macros.get("phone_email")!({chatId:"shared",userId:"v"})).toContain("Shared plan");
    failReceipts=true;expect(await macros.get("phone_email")!({chatId:"shared",userId:"v"})).toBe("");expect(await macros.get("phone_format")!({chatId:"shared",userId:"v"})).toContain("call:");expect(warnings.join()).not.toContain("PRIVATE receipt failure");failReceipts=false;
    expect(generations[0].type).toBe("raw");expect(generations[0].connection_id).toBe("small");expect(generations[0].userId).toBe("u");expect((generations[0].messages as unknown[]).length).toBe(2);
    // Personal settings RPC uses transport identity, including real preview and apply paths.
    const p0=await request({type:"phone_personal",chatId:"a"},"u");expect(p0.type).toBe("phone_personal_result");
    const p1=await request({type:"phone_personal",chatId:"a",revision:0,change:{kind:"wording_save",target:"main",name:"U wording",text:"U CUSTOM [[phone_syntax]]"}},"u");expect(p1.type).toBe("phone_personal_result");
    const pv=await request({type:"phone_personal",chatId:"a",change:{kind:"preview",target:"main"}},"u");expect((pv.preview as {text:string}).text).toBe(await nativePull("a","u"));expect((pv.preview as {text:string}).text).toContain("U CUSTOM");
    expect(await nativePull("c","v")).not.toContain("U CUSTOM");
    const noChat=await request({type:"phone_personal",chatId:null},"u");expect(noChat.type).toBe("phone_personal_result");expect(noChat.chatId).toBeNull();
    const denied=await request({type:"phone_personal",chatId:"a"},"v");expect(denied.type).toBe("phone_personal_error");
    const now=await request({type:"phone_sync",chatId:"a"},"u");const beforeApply=now.snapshot as ReturnType<typeof emptyDocument>;const paidBefore=generations.length;
    const applied=await request({type:"phone_personal",chatId:"a",chatRevision:beforeApply.revision,change:{kind:"preset_apply",id:"minimal",confirm:true}},"u");expect(applied.type).toBe("phone_personal_result");const afterApply=applied.snapshot as ReturnType<typeof emptyDocument>;expect(afterApply.state).toEqual(beforeApply.state);expect(afterApply.settings.source).toBe(beforeApply.settings.source);expect(afterApply.settings.aiPlayerTexts).toBe(beforeApply.settings.aiPlayerTexts);expect(generations.length).toBe(paidBefore);
    const ph=await request({type:"phone_personal",chatId:"c",revision:0,change:{kind:"wording_save",target:"helper",name:"V helper",text:"V HELPER [[phone_syntax]]"}},"v");expect(ph.type).toBe("phone_personal_result");
    const helperPreview=await request({type:"phone_personal",chatId:"c",change:{kind:"preview",target:"helper"}},"v");const hpText=(helperPreview.preview as {text:string}).text;
    await request({type:"phone_helper_now",chatId:"c"},"v");expect(String((generations.at(-1)!.messages as any[])[0].content)).toBe(hpText);expect(hpText).toContain("V HELPER");expect(hpText).toContain("Null means unknown");expect(generations.at(-1)!.userId).toBe("v");
    const p2=await request({type:"phone_personal",chatId:"a",revision:1,change:{kind:"wording_save",target:"main",id:(p1.personal as any).wordings.main[0].id,name:"U wording",text:"U WORDING WITHOUT TOKEN"}},"u");expect(p2.type).toBe("phone_personal_result");expect(await nativePull("a","u")).toContain("<phone-text");expect(warnings.at(-1)).toContain("missing syntax");expect(warnings.at(-1)).not.toContain("U WORDING");
    Object.assign(fake,{characters:{get:async(_id:string,u:string)=>{scoped(u,"characters.get");return {name:"Ada",description:"Zoe is a guide. Her phone is 555666.",personality:"",scenario:"",world_book_ids:[]};}},personas:{getActive:async(u:string)=>{scoped(u,"personas.getActive");return {name:"Player",description:"Player is a traveler.",attached_world_book_id:null};}},world_books:{getGlobal:async(u:string)=>{scoped(u,"world_books.getGlobal");return ["book"];},entries:{list:async(_id:string,o:any)=>{scoped(o.userId,"world_books.entries.list");return {data:[],total:0};}}},tokens:{countMessages:async(_m:unknown,o:any)=>{scoped(o.userId,"tokens.countMessages");return {total_tokens:123,approximate:true};}}});
    setupMode=true;const setupSync=await request({type:"phone_sync",chatId:"a"},"u");await request({type:"phone_update",chatId:"a",revision:(setupSync.snapshot as any).revision,settings:{apps:{Contacts:true},source:"main"}},"u");const setupPaid=generations.length;
    const plan=await request({type:"phone_setup_prepare",chatId:"a",choices:["Contacts"]},"u");expect(plan.type).toBe("phone_setup_result");const planId=(plan.result as any).id;expect((plan.result as any).tokens).toBe(123);expect(generations.length).toBe(setupPaid);
    const beforeSetupRun=persisted.get("a/lpt_phone_v2");const setupRun=await request({type:"phone_setup_run",chatId:"a",id:planId},"u");expect(setupRun.type).toBe("phone_setup_result");expect(persisted.get("a/lpt_phone_v2")).toBe(beforeSetupRun);expect(generations.length).toBe(setupPaid+1);expect(generations.at(-1)!.userId).toBe("u");
    expect((await request({type:"phone_setup_save",chatId:"a",id:planId},"u")).type).toBe("phone_setup_error");const setupSaved=await request({type:"phone_setup_save",chatId:"a",id:planId,confirm:true},"u");expect(setupSaved.type).toBe("phone_setup_result");expect((setupSaved.result as any).snapshot.state.contacts.some((c:any)=>c.name==="Zoe")).toBe(true);expect(calls).toContain("tokens.countMessages");expect(calls).toContain("world_books.entries.list");
    const callCount=calls.length;receive({type:"phone_personal",requestId:"spoof",userId:"u",chatId:"a"},undefined as never);await Bun.sleep(5);expect(calls.length).toBe(callCount);
  } finally { (globalThis as unknown as { spindle?: unknown }).spindle = prior; }
});

// Frontend wiring and real DOM interactions are verified by scripts/test-ui.ts.

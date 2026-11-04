import { expect, test } from "bun:test";
import type { SpindleAPI } from "lumiverse-spindle-types";

test("actual backend: render/prompt hooks, scoped receipts, Main AI safety and explicit Helper AI", async () => {
  let processor: Parameters<SpindleAPI["registerMessageContentProcessor"]>[0] | undefined;
  let interceptor: Parameters<SpindleAPI["registerInterceptor"]>[0] | undefined;
  const capabilities: string[] = []; const events: string[] = [];
  const handlers=new Map<string,(payload:unknown,userId?:string)=>void>();const generations:Record<string,unknown>[]=[];
  const persisted = new Map<string, unknown>();
  let receive!: (payload: unknown, userId: string) => void;
  let deliver: (p: Record<string, unknown>, user: string) => void = () => {};
  let registrationOptions: unknown;
  const calls: string[] = []; const warnings: string[] = [];
  let failReads = false;
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
    registerInterceptor: (handler: typeof interceptor, options: unknown) => { interceptor = handler; registrationOptions = options; },
    onFrontendMessage: (fn: typeof receive) => { receive = fn; return () => {}; },
    on: (event: string,fn:(payload:unknown,userId?:string)=>void) => { events.push(event);handlers.set(event,fn); return () => {}; },
    connections:{list:async(user:string)=>{scoped(user,"connections.list");return [{id:"small",name:"Existing profile",model:"Test model"}];}},
    generate:{raw:async(input:Record<string,unknown>)=>{scoped(input.userId,"generate.raw");generations.push(input);return {content:"{}",finish_reason:"stop"};}},
    chats: { get: async (id: string, user: string) => {scoped(user,"chats.get");return user === "u" ? { id } : null;}, getActive: async (user:string) => {scoped(user,"chats.getActive");return { id: "a" };} },
    chat: { getMessages: async (chat: string) => [{ id: "m1", chat_id: chat, index_in_chat: 0, role: "assistant", content: `<phone-state>location="${chat}"</phone-state><phone-text from="Ada">Actual saved test text</phone-text>`, swipe_id: 0 }] },
    userStorage: {
      exists: async (path: string, user: string) => {scoped(user,"userStorage.exists");return persisted.has(`${user}/${path}`);},
      read: async (path: string, user: string) => {scoped(user,"userStorage.read");return JSON.stringify(persisted.get(`${user}/${path}`));},
      getJson: async (path: string, options: { userId: string; fallback: unknown }) => {scoped(options?.userId,"userStorage.getJson");return structuredClone(persisted.get(`${options.userId}/${path}`) ?? options.fallback);},
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
    const beforePreview = [...persisted.entries()];
    for (const handler of macros.values()) {
      for (const context of [{},{chatId:"a"},{userId:"u"},{chatId:"a",userId:" "}]) { const count=calls.length; expect(await handler(context)).toBe(""); expect(calls.length).toBe(count); }
      expect(await handler({chatId:"a",userId:"other-user",commit:false})).toBe("");
      expect(typeof await handler({chatId:"a",userId:"u",commit:false})).toBe("string");
    }
    expect(await macros.get("phone_scene")!({chatId:"a",userId:"u",commit:false})).toContain("location:");
    expect([...persisted.entries()]).toEqual(beforePreview);
    failReads=true;
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
    const done=await request({type:"phone_helper_now",chatId:"a"},"u");expect(done.type).toBe("phone_helper_now_result");expect(generations.length).toBe(1);
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
    expect(generations[0].type).toBe("raw");expect(generations[0].connection_id).toBe("small");expect(generations[0].userId).toBe("u");expect((generations[0].messages as unknown[]).length).toBe(2);
  } finally { (globalThis as unknown as { spindle?: unknown }).spindle = prior; }
});

// Frontend wiring and real DOM interactions are verified by scripts/test-ui.ts.

import {test,expect} from "bun:test";
import {mkdir,unlink,rmdir} from "node:fs/promises";

for(const mode of ["compiled","source"] as const)test(`testing ${mode}: no native or interceptor macros, including permission changes`,async()=>{
 const dir=`.build-tmp/no-macros-test-${crypto.randomUUID()}`;await mkdir(dir,{recursive:true});let macro=0,templates=0,processor=0,prompt=0,frontend=0;let changed=()=>{};
 const fake={registerMacro:()=>macro++,registerMacroInterceptor:()=>templates++,registerMessageContentProcessor:()=>processor++,registerInterceptor:()=>prompt++,onFrontendMessage:()=>frontend++,on:()=>{},frontendCapabilities:{declare:()=>{}},permissions:{has:()=>true,onChanged:(fn:()=>void)=>{changed=fn;}},log:{info:()=>{},warn:()=>{}}};
 const result=await Bun.build({entrypoints:["src/backend.ts"],outdir:dir,target:"bun",define:{LPT_NO_PROMPT_MACROS:"true"}});expect(result.success).toBe(true);
 const prior=(globalThis as any).spindle;(globalThis as any).spindle=fake;
 try{await import(mode==="compiled"?`../${dir}/backend.js`:`../src/backend.ts?no-macros-source=${crypto.randomUUID()}`);changed();changed();expect(macro).toBe(0);expect(templates).toBe(0);expect(processor).toBe(1);expect(prompt).toBe(1);expect(frontend).toBe(1);}finally{(globalThis as any).spindle=prior;await unlink(`${dir}/backend.js`);await rmdir(dir);}
});

import {test,expect} from "bun:test";
import {createUiIds} from "../src/ui-id";
test("advertised host UUID helper supplies UI IDs",()=>{let calls=0;const id=createUiIds({host:{capabilities:{"frontend-uuid-v1":1}},uuid:{v4:()=>"host-"+(++calls)}});expect(id()).toBe("host-1");expect(id()).toBe("host-2");expect(calls).toBe(2);});
test("older hosts use isolated non-security correlation IDs without direct browser UUID calls",()=>{const a=createUiIds({}),b=createUiIds({});const ids=Array.from({length:10000},()=>a());expect(new Set(ids).size).toBe(ids.length);expect(ids).not.toContain(b());expect(ids.every(id=>id.length<100&&/^[a-z0-9-]+$/.test(id))).toBe(true);});
test("built frontend contains no blocked direct UUID call",async()=>{const built=await Bun.build({entrypoints:["src/frontend.ts"],target:"browser"});expect(built.success).toBe(true);expect(await built.outputs[0].text()).not.toMatch(/\bcrypto\s*\.\s*randomUUID\s*\(/);});

import {expect,test} from "bun:test";
import {readStyleFile,STYLE_FILE_LIMIT} from "../src/style-files";
import {PreferenceStore,defaultPreferences,readPreferences} from "../src/preferences";
test("CSS file reads accept UTF-8 styles above the former textarea limit",async()=>{
 const source="/*"+"x".repeat(40000)+"*/\n.lpt-root { --lpt-accent:#abcdef; }";
 expect(await readStyleFile(new File([source],"styles.css",{type:"text/css"}))).toBe(source);
 expect(await readStyleFile(new File([".x{color:red}"],"sidebar.CSS"))).toContain("red");
 for(const file of [new File(["x"],"styles.txt"),new File(["x".repeat(STYLE_FILE_LIMIT+1)],"big.css"),new File([new Uint8Array([0xff,0xfe,0x61])],"wrong.css"),new File(["a\0b"],"binary.css")])await expect(readStyleFile(file)).rejects.toThrow();
});
test("both stylesheet uploads are per-user, preserve legacy appearance and reset together",async()=>{
 const data=new Map<string,unknown>();const store=new PreferenceStore({read:async u=>structuredClone(data.get(u)??defaultPreferences()),write:async(u,v)=>{data.set(u,structuredClone(v));}});
 data.set("a",{revision:1,css:".lpt-root{color:red}",dismissed:["Home"]});const legacy=await store.read("a");expect(legacy.css).toContain("red");expect(legacy.sidebarCss).toBeUndefined();
 await Promise.all([store.update("a",{css:"/*"+"x".repeat(40000)+"*/"}),store.update("a",{sidebarCss:".lpt-side-title{color:blue}"})]);const saved=await store.read("a");expect(saved.css.length).toBeGreaterThan(32000);expect(saved.sidebarCss).toContain("blue");expect(saved.dismissed).toEqual(["Home"]);expect(await store.read("b")).toEqual(defaultPreferences());
 const reset=await store.update("a",{css:"",sidebarCss:""});expect(reset.css).toBe("");expect(reset.sidebarCss).toBe("");expect(reset.dismissed).toEqual(["Home"]);
 await expect(store.update("a",{sidebarCss:"x".repeat(STYLE_FILE_LIMIT+1)})).rejects.toThrow();expect(()=>readPreferences({...reset,sidebarCss:123})).toThrow();
});

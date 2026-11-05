import {test,expect} from "bun:test";
import {UI_ICONS,UI_ICON_RAW_BYTES} from "../src/ui-icons";
test("only eight supplied sidebar PNGs are bundled as static 64-square data URIs",()=>{
 expect(Object.keys(UI_ICONS).sort()).toEqual(["advanced","apps","helper","look","open-phone","refresh","reset","track"]);
 let total=0;for(const uri of Object.values(UI_ICONS)){expect(uri.startsWith("data:image/png;base64,")).toBe(true);const b=Buffer.from(uri.split(",")[1],"base64");expect(b.subarray(0,8).toString("hex")).toBe("89504e470d0a1a0a");expect(b.readUInt32BE(16)).toBe(64);expect(b.readUInt32BE(20)).toBe(64);total+=b.length;}
 expect(total).toBe(UI_ICON_RAW_BYTES);expect(total).toBe(46981);expect(Object.values(UI_ICONS).reduce((n,s)=>n+s.length,0)).toBe(62828);
});

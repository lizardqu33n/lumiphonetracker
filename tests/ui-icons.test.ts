import {test,expect} from "bun:test";
import {createHash} from "node:crypto";
import cropReport from "../docs/ICON-CROPS.json";
import {UI_ICONS,UI_ICON_RAW_BYTES} from "../src/ui-icons";

test("eight supplied sidebar PNGs use tight transparent crops with audited artwork",()=>{
 expect(Object.keys(UI_ICONS).sort()).toEqual(["advanced","apps","helper","look","open-phone","refresh","reset","track"]);
 let total=0;
 for(const [name,uri]of Object.entries(UI_ICONS)){
  const cell=cropReport.assets.find(a=>a.module==="ui-icons.ts"&&a.name===name)!;
  expect(uri.startsWith("data:image/png;base64,")).toBe(true);
  const b=Buffer.from(uri.split(",")[1],"base64");expect(b.subarray(0,8).toString("hex")).toBe("89504e470d0a1a0a");
  expect([b.readUInt32BE(16),b.readUInt32BE(20)]).toEqual(cell.size);expect(createHash("sha256").update(b).digest("hex")).toBe(cell.png_sha256);total+=b.length;
 }
 expect(total).toBe(UI_ICON_RAW_BYTES);
 expect(total).toBe(cropReport.assets.filter(a=>a.module==="ui-icons.ts").reduce((sum,a)=>sum+a.png_bytes,0));
});

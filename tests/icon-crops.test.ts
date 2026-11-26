import {test,expect} from "bun:test";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import report from "../docs/ICON-CROPS.json";
import {rgba} from "./png";

test("all 70 static icons keep every nonzero-alpha pixel and have tight proportional canvases",()=>{
 let count=0;
 for(const file of report.files){
  const text=readFileSync(new URL("../src/"+file.module,import.meta.url),"utf8");
  const items=report.assets.filter(a=>a.module===file.module);
  const uris=[...text.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)];expect(uris.length).toBe(items.length);
  for(let i=0;i<uris.length;i++){
   const data=Buffer.from(uris[i][1],"base64"),image=rgba(data),expected=items[i];
   expect([image.w,image.h]).toEqual(expected.size);expect(expected.bounds[2]-expected.bounds[0]).toBe(image.w);expect(expected.bounds[3]-expected.bounds[1]).toBe(image.h);
   expect(createHash("sha256").update(data).digest("hex")).toBe(expected.png_sha256);expect(createHash("sha256").update(image.out).digest("hex")).toBe(expected.rgba_sha256);
   const alpha=Array(256).fill(0);let left=false,right=false,top=false,bottom=false;
   for(let y=0;y<image.h;y++)for(let x=0;x<image.w;x++){const a=image.out[(y*image.w+x)*4+3];alpha[a]++;if(a){if(x===0)left=true;if(x===image.w-1)right=true;if(y===0)top=true;if(y===image.h-1)bottom=true;}}
   expect(alpha).toEqual(expected.alpha_histogram);expect(alpha.slice(1)).toEqual(expected.source_alpha_histogram.slice(1));expect(left&&right&&top&&bottom).toBe(true);count++;
  }
 }
 expect(count).toBe(70);expect(report.cropped_count).toBe(69);
});

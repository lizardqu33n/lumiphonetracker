import {test,expect} from "bun:test";
import {createHash} from "node:crypto";
import {rgba} from "./png";
import {readFileSync} from "node:fs";
import {EMOJI_IMAGES,EMOJI_NAMES} from "../src/emoji-assets";
import {emojiParts,insertEmoji} from "../src/emoji";
import {parseExpanded,parseExpandedReply} from "../src/schema";
import {replyTag,addReplyDraft} from "../src/messages";
const report=JSON.parse(readFileSync(new URL("../docs/EMOJI-ASSETS.json",import.meta.url),"utf8"));
const names="smile laugh sad heart_eyes wink blush angry surprised sleepy heart thumbs_up sparkles crying pensive content pleading happy_blush sad_pleading unamused angel angry_devil devil happy_tear kiss_blush kiss_heart tongue sweat cool".split(" ");

test("all 28 optimized full-cell PNGs preserve audited provenance, alpha and row-major names",()=>{
 const optimization=JSON.parse(readFileSync(new URL("../docs/ASSET-OPTIMIZATION.json",import.meta.url),"utf8"));
 expect(EMOJI_NAMES).toEqual(names as any);let bytes=0;
 for(const [i,name]of EMOJI_NAMES.entries()){
  const uri=EMOJI_IMAGES[name];expect(uri.startsWith("data:image/png;base64,")).toBe(true);
  const png=Buffer.from(uri.split(",")[1],"base64"),decoded=rgba(png),source=report.cells[i],cell=optimization.assets.find((c:any)=>c.module==="emoji-assets.ts"&&c.name===name);
  expect(cell.source_png_sha256).toBe(source.sha256);expect(cell.source_rgba_sha256).toBe(source.rgba_sha256);
  expect(createHash("sha256").update(png).digest("hex")).toBe(cell.png_sha256);expect([decoded.w,decoded.h]).toEqual(cell.size);
  expect(Math.max(decoded.w,decoded.h)).toBeLessThanOrEqual(64);expect(cell.crop_bounds[2]-cell.crop_bounds[0]).toBe(decoded.w);expect(cell.crop_bounds[3]-cell.crop_bounds[1]).toBe(decoded.h);
  expect(createHash("sha256").update(decoded.out).digest("hex")).toBe(cell.rgba_sha256);
  const histogram=Array(256).fill(0);for(let k=3;k<decoded.out.length;k+=4)histogram[decoded.out[k]]++;
  expect(histogram).toEqual(cell.alpha_histogram);expect(histogram[0]).toBeGreaterThan(0);bytes+=png.length;
 }
 expect(bytes).toBe(optimization.files.find((f:any)=>f.module==="emoji-assets.ts").png_bytes);
 expect(bytes).toBeLessThan(report.raw_png_bytes/10);
 // The full source-cell audit and approved sleepy-Z correction remain intact.
 expect(report.cells.find((c:any)=>c.name==="sleepy").size).toEqual([362,367]);
});

test("only exact known shortcodes render; unknown names, HTML and ordinary colons stay text",()=>{
 expect(emojiParts('A :smile::heart: :not_known: <img src=x> 12:10 | :SMILE:')).toEqual(['A ',{name:'smile'},{name:'heart'},' :not_known: <img src=x> 12:10 | :SMILE:']);expect(emojiParts(':__proto__:')).toEqual([':__proto__:']);
 expect(insertEmoji('Hello world',6,11,'wink')).toEqual({value:'Hello :wink:',caret:12});expect(insertEmoji('A B',2,2,'heart')).toEqual({value:'A :heart:B',caret:9});expect(insertEmoji('x'.repeat(3000),3000,3000,'smile')).toBeNull();expect(insertEmoji('text',0,4,'not_known')).toBeNull();
});
test("shortcode colons cannot consume field separators or change pipe validation",()=>{
 const p=parseExpanded(`weather: Clear :smile:
people: Promise :heart: | Meet Ada :wink: | Tomorrow
c: Ada | mood=:blush: | pos=by the gate :sparkles:`)!;expect(p.weather?.value).toBe('Clear :smile:');expect(p.notes.people?.[0].name).toBe('Promise :heart:');expect(p.contacts[0].fields.mood?.value).toBe(':blush:');
 expect(parseExpanded('weather: Clear | :smile:')).toBeNull();const tag=replyTag('Player','Ada','A < B & :smile: | :not_known:');expect(parseExpandedReply(tag).texts[0].text).toBe('A < B & :smile: | :not_known:');
 let sends=0,draft='';const ctx={host:{capabilities:{'composer-v1':1}},composer:{getState:()=>({mounted:true,chatId:'a',text:draft}),insertText:(t:string)=>{draft+=t;},focus:()=>{},send:()=>{sends++;}}};
 addReplyDraft(ctx as never,'a','Player','Ada',':heart:');expect(draft).toContain(':heart:');expect(sends).toBe(0);
});

import {test,expect} from "bun:test";
import {createHash} from "node:crypto";
import {inflateSync} from "node:zlib";
import {readFileSync} from "node:fs";
import {EMOJI_IMAGES,EMOJI_NAMES} from "../src/emoji-assets";
import {emojiParts,insertEmoji} from "../src/emoji";
import {parseExpanded,parseExpandedReply} from "../src/schema";
import {replyTag,addReplyDraft} from "../src/messages";
const report=JSON.parse(readFileSync(new URL("../docs/EMOJI-ASSETS.json",import.meta.url),"utf8"));
const names="smile laugh sad heart_eyes wink blush angry surprised sleepy heart thumbs_up sparkles crying pensive content pleading happy_blush sad_pleading unamused angel angry_devil devil happy_tear kiss_blush kiss_heart tongue sweat cool".split(" ");
function rgba(png:Buffer){
 expect(png.subarray(0,8).toString("hex")).toBe("89504e470d0a1a0a");const w=png.readUInt32BE(16),h=png.readUInt32BE(20);expect(png[24]).toBe(8);expect(png[25]).toBe(6);expect(png[28]).toBe(0);
 const idat:Buffer[]=[];for(let p=8;p+12<=png.length;){const size=png.readUInt32BE(p),type=png.toString("ascii",p+4,p+8);if(type==="IDAT")idat.push(png.subarray(p+8,p+8+size));p+=size+12;}
 const data=inflateSync(Buffer.concat(idat)),stride=w*4,out=Buffer.alloc(h*stride);let p=0;
 for(let y=0;y<h;y++){const filter=data[p++];if(filter>4)throw Error("Unsupported PNG filter");for(let x=0;x<stride;x++){const a=x>=4?out[y*stride+x-4]:0,b=y?out[(y-1)*stride+x]:0,c=y&&x>=4?out[(y-1)*stride+x-4]:0;let predictor=0;if(filter===1)predictor=a;else if(filter===2)predictor=b;else if(filter===3)predictor=Math.floor((a+b)/2);else if(filter===4){const q=a+b-c,pa=Math.abs(q-a),pb=Math.abs(q-b),pc=Math.abs(q-c);predictor=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}out[y*stride+x]=(data[p++]+predictor)&255;}}
 return {w,h,out};
}
test("all 28 full-cell PNGs preserve exact audited RGBA, alpha and row-major names",()=>{
 expect(EMOJI_NAMES).toEqual(names as any);let bytes=0;const histogram=Array(256).fill(0);
 for(const [i,name]of EMOJI_NAMES.entries()){const uri=EMOJI_IMAGES[name];expect(uri.startsWith("data:image/png;base64,")).toBe(true);const png=Buffer.from(uri.split(",")[1],"base64"),decoded=rgba(png),cell=report.cells[i];expect(createHash("sha256").update(png).digest("hex")).toBe(cell.sha256);expect([decoded.w,decoded.h]).toEqual(cell.size);expect(createHash("sha256").update(decoded.out).digest("hex")).toBe(cell.rgba_sha256);bytes+=png.length;for(let k=3;k<decoded.out.length;k+=4)histogram[decoded.out[k]]++;}
 expect(bytes).toBe(report.raw_png_bytes);const original=Array.from({length:256},(_,i)=>report.sources.reduce((n:number,s:any)=>n+s.alpha_histogram[i],0));expect(histogram.slice(1)).toEqual(original.slice(1));expect(histogram[0]).toBe(original[0]+362*5);expect(report.cells.find((c:any)=>c.name==="sleepy").size).toEqual([362,367]);
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

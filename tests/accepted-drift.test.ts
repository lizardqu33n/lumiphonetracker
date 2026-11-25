import {expect,test} from "bun:test";
import {sameAccepted} from "../src/phone-store";
import {emptyDocument} from "../src/model";
import {replay,type StoryRow} from "../src/engine";
const rows:StoryRow[]=Array.from({length:3},(_,i)=>({id:`m${i}`,chat_id:"a",index_in_chat:i,role:"assistant",content:`<phone-state>time: Hour ${i}</phone-state>`,swipe_id:0}));
const journal=()=>replay(emptyDocument("a"),rows,["Player"]).accepted;

test("accepted journal length and changed tail exit before serializing older entries",()=>{
 const a=journal(),b=structuredClone(a);
 Object.defineProperty(a[0],"toJSON",{value:()=>{throw Error("Old entry must not be serialized");}});
 expect(sameAccepted(a,b.slice(1))).toBe(false);
 b.at(-1)!.patch.scene.time!.value="Later";
 expect(sameAccepted(a,b)).toBe(false);
});
test("same-sized history with unchanged last entry still detects earlier drift",()=>{
 const a=journal(),b=structuredClone(a);
 b[0].patch.scene.time!.value="Changed earliest fact";
 expect(sameAccepted(a,b)).toBe(false);
 b[0]=structuredClone(a[0]);b[1].at.variant="alternate swipe";
 expect(sameAccepted(a,b)).toBe(false);
 expect(sameAccepted(a,structuredClone(a))).toBe(true);
 expect(sameAccepted([],[])).toBe(true);
});
test("per-entry comparison preserves the previous canonical comparison semantics",()=>{
 const a=journal();
 const reordered=(value:any):any=>Array.isArray(value)?value.map(reordered):value&&typeof value==="object"?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reordered(v)])):value;
 const b=reordered(a);expect(sameAccepted(a,b)).toBe(true);
 for(let i=0;i<3;i++){const changed=structuredClone(b);changed[i].texts.push({from:"Ada",text:"New text"});expect(sameAccepted(a,changed)).toBe(false);}
});

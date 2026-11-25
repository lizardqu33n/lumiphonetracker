import {sameAccepted} from "../src/phone-store";
import {emptyDocument} from "../src/model";
import {replay} from "../src/engine";
const template=replay(emptyDocument("a"),[{id:"m",chat_id:"a",index_in_chat:0,role:"assistant",content:'<phone-state>time: Midnight</phone-state>',swipe_id:0}],["Player"]).accepted[0];
const a=Array.from({length:1000},(_,i)=>({...structuredClone(template),at:{...template.at,id:`m${i}`,index:i},texts:[{from:"Ada",text:"A stated message. ".repeat(50)}]}));
const canonical=(_key:string,v:unknown):unknown=>v&&typeof v==="object"&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v;
const old=(b:typeof a)=>JSON.stringify(a,canonical)===JSON.stringify(b,canonical);
const tail=structuredClone(a);tail.at(-1)!.texts[0].text="Changed";
const earlier=structuredClone(a);earlier[0].texts[0].text="Changed";
const scenarios={unchanged:structuredClone(a),appended:[...structuredClone(a),structuredClone(template)],changedTail:tail,changedEarlier:earlier};
for(const [name,b]of Object.entries(scenarios)){
 const measure=(fn:()=>boolean)=>{let result=false;const start=performance.now();for(let i=0;i<5;i++)result=fn();return {equal:result,meanMs:Number(((performance.now()-start)/5).toFixed(3))};};
 console.log(JSON.stringify({scenario:name,old:measure(()=>old(b)),new:measure(()=>sameAccepted(a,b))}));
}
console.log(JSON.stringify({entries:a.length,journalCharacters:JSON.stringify(a,canonical).length,note:"Synthetic comparison timings only; no real server heap measurement."}));

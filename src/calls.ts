import {normalize,type CallData} from "./model";
import {transformTags} from "./tags";
import type {StoryRow} from "./engine";

/** Count and swipe are deliberately excluded: one source fact has one identity. */
export const callId=(source:string,call:CallData)=>JSON.stringify(["call",source,normalize(call.name),call.direction,normalize(call.time??"")]);

/** Helper attribution is data in our request, never an inferred host context. */
export function helperCallSource(call:CallData,rows:StoryRow[]):StoryRow|undefined {
    if(!call.source || !call.evidence)return;
    const row=rows.find(r=>r.id===call.source && r.role!=="system");
    if(!row || !transformTags(row.content,"strip").includes(call.evidence))return;
    const quote=normalize(call.evidence);
    const name=normalize(call.name);
    const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    if(name!=="unknown caller" && !new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`,"u").test(quote))return;
    if(!/\b(?:call|calls|called|calling|caller|dial|dialed|rang|ring|rings|ringing|phoned|phone)\b/.test(quote))return;
    if(/\b(?:not|never|no|if|would|might|plan|pretend|cancel|try)\b|n['’]t/.test(quote))return;
    if(call.direction==="missed" && !/\b(?:missed|unanswered)\b/.test(quote))return;
    if(call.time && !quote.includes(normalize(call.time)))return;
    if((call.count??1)>1){
        const words=["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
        const n=call.count!;
        if(!new RegExp(`\\b(?:${n}|${words[n]})(?: missed| unanswered| incoming| outgoing)? (?:calls?|times)\\b`).test(quote))return;
    }
    return row;
}

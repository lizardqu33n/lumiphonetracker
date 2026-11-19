import type { LlmMessageDTO } from "lumiverse-spindle-types";
import type { Document, Settings } from "./model";
import { normalize } from "./model";
import { decodeEntities, parseAttributes, scanTags } from "./tags";

/** Only admitted, authored texts may remain in the recent prompt window. */
export function trimPhoneHistory(messages: LlmMessageDTO[], settings: Settings, document?: Document): LlmMessageDTO[] {
  const history = messages.map((m, i) => ({ m, i })).filter(x => x.m.__isChatHistory === true);
  const indexed = history.every(x => Number.isInteger(x.m.sourceIndexInChat));
  let last=-1;for(const {m,i}of history)last=Math.max(last,m.sourceIndexInChat??i);
  const unique=new Map<string,number>();
  for (const { m, i } of history) { const id = m.sourceMessageId ?? `part:${i}`; if (!unique.has(id)) unique.set(id,unique.size); }
  const recent = (m: LlmMessageDTO, index: number, n: number) => n > 0 && (indexed ? (m.sourceIndexInChat ?? -1) > last - n :
    (unique.get(m.sourceMessageId ?? `part:${index}`)??-1) >= unique.size - n);
  const admittedTexts=new Set<string>();
  const textKey=(source:string,from:string,body:string,to:string)=>JSON.stringify([source,normalize(from),body,to]);
  for(const t of document?.state.messages??[]){admittedTexts.add(textKey("id:"+t.at.id,t.from,t.text,t.to??""));admittedTexts.add(textKey("index:"+t.at.index,t.from,t.text,t.to??""));}
  return messages.map((message, index) => {
    if (!message.__isChatHistory) return message;
    const transform = (text: string) => {
      let out = ""; let offset = 0;
      for (const span of scanTags(text)) {
        out += text.slice(offset, span.start);
        let keep = span.complete && span.canonical;
        if (span.name === "phone-state") keep = keep && recent(message, index, settings.keepTrackers);
        else if (span.name === "phone-text") {
          const attrs = parseAttributes(span.header);
          const body = decodeEntities(span.body).trim();
          const source=message.sourceMessageId?"id:"+message.sourceMessageId:Number.isInteger(message.sourceIndexInChat)?"index:"+message.sourceIndexInChat:null;
          const admitted=!!attrs&&source!==null&&admittedTexts.has(textKey(source,attrs.from??"",body,attrs.to??""));
          keep = keep && settings.apps.Messages && settings.enabled.messages && recent(message, index, settings.keepTexts) && admitted;
        } else keep = false;
        if (keep) out += text.slice(span.start, span.end);
        offset = span.end;
      }
      return out + text.slice(offset);
    };
    if (typeof message.content === "string") return { ...message, content: transform(message.content) };
    const parts: typeof message.content = []; let pending = "";
    const flush = () => { if (pending) parts.push({ type: "text", text: transform(pending) }); pending = ""; };
    for (const part of message.content) { if (part.type === "text") pending += part.text; else { flush(); parts.push(part); } }
    flush(); return { ...message, content: parts };
  });
}

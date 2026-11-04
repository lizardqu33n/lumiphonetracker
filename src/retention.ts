import type { LlmMessageDTO } from "lumiverse-spindle-types";
import type { Document, Settings } from "./model";
import { normalize } from "./model";
import { decodeEntities, parseAttributes, scanTags } from "./tags";

/** Only admitted, authored texts may remain in the recent prompt window. */
export function trimPhoneHistory(messages: LlmMessageDTO[], settings: Settings, document?: Document): LlmMessageDTO[] {
  const history = messages.map((m, i) => ({ m, i })).filter(x => x.m.__isChatHistory === true);
  const indexed = history.every(x => Number.isInteger(x.m.sourceIndexInChat));
  const last = Math.max(-1, ...history.map(x => x.m.sourceIndexInChat ?? x.i));
  const unique: string[] = [];
  for (const { m, i } of history) { const id = m.sourceMessageId ?? `part:${i}`; if (!unique.includes(id)) unique.push(id); }
  const recent = (m: LlmMessageDTO, index: number, n: number) => n > 0 && (indexed ? (m.sourceIndexInChat ?? -1) > last - n :
    unique.indexOf(m.sourceMessageId ?? `part:${index}`) >= unique.length - n);
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
          const admitted = !!attrs && !!document?.state.messages.some(t =>
            (message.sourceMessageId ? t.at.id === message.sourceMessageId : Number.isInteger(message.sourceIndexInChat) && t.at.index === message.sourceIndexInChat) &&
            normalize(t.from) === normalize(attrs.from ?? "") && t.text === body && (t.to ?? "") === (attrs.to ?? ""));
          keep = keep && settings.enabled.messages && recent(message, index, settings.keepTexts) && admitted;
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

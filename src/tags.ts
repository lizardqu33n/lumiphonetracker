import type { LlmMessageDTO } from "lumiverse-spindle-types";
import { TEXT_TAG, TRACKER_TAG } from "./shared";

export interface TagSpan {
  name: string;
  start: number;
  end: number;
  header: string;
  body: string;
  complete: boolean;
  canonical: boolean;
}
const NAMES = [TRACKER_TAG, TEXT_TAG,"phone-email"];
const OPENINGS=NAMES.map(name=>"<"+name);
const MAX_NAME_LENGTH=Math.max(...NAMES.map(name=>name.length));
const space = (c: string) => c === " " || c === "\u2800" || c === "\n" || c === "\r" || c === "\t";

/** A small scanner for our two reserved tags, never an HTML parser or regex script. */
function* tagSpans(text: string,includeBody=true): Generator<TagSpan> {
  if (!text.includes("<")) return;
  const folded = text.toLowerCase();
  const lower = folded.length === text.length ? folded : text.replace(/[A-Z]/g, char => char.toLowerCase());
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "<") continue;
    let n = i + 1;
    const closing = text[n] === "/";
    if (closing) n++;
    let name:string|undefined;
    for(const candidate of NAMES) {
      const next=lower[n+candidate.length];
      if(lower.startsWith(candidate,n)&&(next===undefined||space(next)||next===">"||next==="/")){name=candidate;break;}
    }
    if (!name) {
      const tail=lower.slice(n,n+MAX_NAME_LENGTH+1);
      // Withhold even a half-written opening/closing name until it is disambiguated.
      if (tail.length === 0 || NAMES.some(name => name.startsWith(tail))) {
        yield { name: "", start: i, end: text.length, header: "", body: "", complete: false, canonical: false };
        break;
      }
      continue;
    }
    let quote = "";
    let endHeader = -1;
    for (let j = n + name.length; j < text.length; j++) {
      const c = text[j];
      if (quote) { if (c === quote) quote = ""; }
      else if (c === '"' || c === "'") quote = c;
      else if (c === ">") { endHeader = j; break; }
      else if (c === "<") break;
    }
    if (closing) {
      const end = endHeader < 0 ? text.length : endHeader + 1;
      yield { name, start: i, end, header: "", body: "", complete: false, canonical: false };
      i = end - 1;
      continue;
    }
    const close = `</${name}>`;
    const closeAt = endHeader < 0 ? -1 : lower.indexOf(close, endHeader + 1);
    const bodyEnd=closeAt<0?text.length:closeAt;
    const body = includeBody&&endHeader>=0 ? text.slice(endHeader+1,bodyEnd) : "";
    const lowerBody = endHeader<0?"":lower.slice(endHeader+1,bodyEnd);
    let nested=false;
    for(const opening of OPENINGS)if(lowerBody.includes(opening)){nested=true;break;}
    const end = closeAt < 0 ? text.length : closeAt + close.length;
    yield {
      name, start: i, end, header: endHeader < 0 ? "" : text.slice(n + name.length, endHeader),
      body, complete: closeAt >= 0 && !nested,
      canonical: text.slice(i + 1, n + name.length) === name && text.slice(closeAt, end) === close,
    };
    i = end - 1;
  }
}

/** Existence check without collecting spans or copying tag bodies. */
export function hasPhoneTag(text:string,name?:string,complete=false):boolean {
 for(const span of tagSpans(text,false))if((name===undefined||span.name===name)&&(!complete||span.complete&&span.canonical))return true;
 return false;
}
export function scanTags(text: string): TagSpan[] { return [...tagSpans(text)]; }

/** Complete, canonical tags reach the frontend interceptor; broken ones never paint. */
export function transformTags(text: string, mode: "display" | "strip"): string {
  if (!text.includes("<")) return text;
  const output:string[]=[];
  const headers=new Map<string,boolean>();
  let offset = 0;
  for (const span of tagSpans(text,false)) {
    output.push(text.slice(offset, span.start));
    if (mode === "display" && span.complete && span.canonical) {
      let valid=headers.get(span.header);
      if(valid===undefined) {
        valid=parseAttributes(span.header)!==null;
        if(headers.size<128&&span.header.length<=2048)headers.set(span.header,valid);
      }
      if(valid)output.push(text.slice(span.start, span.end).replaceAll("\u2800", " "));
    }
    offset = span.end;
  }
  output.push(text.slice(offset));
  return output.join("");
}

/** Preserve preset instructions, multipart media, names, and source metadata. */
export function stripHistoryTags(messages: LlmMessageDTO[]): LlmMessageDTO[] {
  return messages.map(message => {
    if (message.__isChatHistory !== true) return message;
    if (typeof message.content === "string") return { ...message, content: transformTags(message.content, "strip") };
    // Join adjacent text parts so a tag split across text chunks cannot leak.
    const parts: typeof message.content = [];
    let pending = "";
    const flush = () => { if (pending) parts.push({ type: "text", text: transformTags(pending, "strip") }); pending = ""; };
    for (const part of message.content) {
      if (part.type === "text") pending += part.text;
      else { flush(); parts.push(part); }
    }
    flush();
    return { ...message, content: parts };
  });
}

export function decodeEntities(text: string): string {
  text = text.replaceAll("\u2800", " ");
  const entities: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
  let output = "";
  for (let i = 0; i < text.length; i++) {
    const entity = text[i] === "&" ? Object.keys(entities).find(e => text.startsWith(e, i)) : undefined;
    if (entity) { output += entities[entity]; i += entity.length - 1; }
    else output += text[i];
  }
  return output;
}

export function parseAttributes(header: string): Record<string, string> | null {
  const attrs: Record<string, string> = Object.create(null);
  let i = 0;
  while (i < header.length) {
    if (!space(header[i])) return null;
    while (space(header[i])) i++;
    if (i === header.length) break;
    const start = i;
    while (i < header.length && !space(header[i]) && header[i] !== "=") i++;
    const key = header.slice(start, i);
    while (space(header[i])) i++;
    if (!key || header[i++] !== "=") return null;
    while (space(header[i])) i++;
    const quote = header[i++];
    if (quote !== '"' && quote !== "'") return null;
    const end = header.indexOf(quote, i);
    if (end < 0 || Object.hasOwn(attrs, key)) return null;
    attrs[key] = decodeEntities(header.slice(i, end));
    i = end + 1;
  }
  return attrs;
}

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
const NAMES = [TRACKER_TAG, TEXT_TAG];
const space = (c: string) => c === " " || c === "\n" || c === "\r" || c === "\t";

/** A small scanner for our two reserved tags, never an HTML parser or regex script. */
export function scanTags(text: string): TagSpan[] {
  const lower = text.toLowerCase();
  const result: TagSpan[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "<") continue;
    let n = i + 1;
    const closing = text[n] === "/";
    if (closing) n++;
    const tail = lower.slice(n);
    const name = NAMES.find(name => tail.startsWith(name) &&
      (tail.length === name.length || space(tail[name.length]) || ">/".includes(tail[name.length])));
    if (!name) {
      // Withhold even a half-written opening/closing name until it is disambiguated.
      if (tail.length === 0 || NAMES.some(name => name.startsWith(tail))) {
        result.push({ name: "", start: i, end: text.length, header: "", body: "", complete: false, canonical: false });
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
      result.push({ name, start: i, end, header: "", body: "", complete: false, canonical: false });
      i = end - 1;
      continue;
    }
    const close = `</${name}>`;
    const closeAt = endHeader < 0 ? -1 : lower.indexOf(close, endHeader + 1);
    const body = endHeader < 0 ? "" : text.slice(endHeader + 1, closeAt < 0 ? text.length : closeAt);
    const nested = NAMES.some(name => body.toLowerCase().includes(`<${name}`));
    const end = closeAt < 0 ? text.length : closeAt + close.length;
    result.push({
      name, start: i, end, header: endHeader < 0 ? "" : text.slice(n + name.length, endHeader),
      body, complete: closeAt >= 0 && !nested,
      canonical: text.slice(i + 1, n + name.length) === name && text.slice(closeAt, end) === close,
    });
    i = end - 1;
  }
  return result;
}

/** Complete, canonical tags reach the frontend interceptor; broken ones never paint. */
export function transformTags(text: string, mode: "display" | "strip"): string {
  let output = "";
  let offset = 0;
  for (const span of scanTags(text)) {
    output += text.slice(offset, span.start);
    if (mode === "display" && span.complete && span.canonical && parseAttributes(span.header)) output += text.slice(span.start, span.end);
    offset = span.end;
  }
  return output + text.slice(offset);
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

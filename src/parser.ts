import { TRACKER_FIELDS, TRACKER_TAG, TEXT_TAG, type TrackerPatch, isRecord } from "./shared";
import { decodeEntities, parseAttributes, scanTags } from "./tags";

export interface PhoneText { from: string; text: string; time?: string }
export interface ParsedReply {
  patch: TrackerPatch;
  texts: PhoneText[];
  invalidTracker: boolean;
  invalidTexts: boolean;
}
export const MAX_BLOCK = 8000;
const clean = (value: unknown, max: number): value is string => typeof value === "string" &&
  value.length <= max && !value.includes("\u0000") && !value.includes("<") && !value.includes("\n") && !value.includes("\r");

export function validatePatch(value: unknown): TrackerPatch | null {
  if (!isRecord(value) || Object.keys(value).some(key => !TRACKER_FIELDS.includes(key as never))) return null;
  const patch: TrackerPatch = {};
  for (const key of TRACKER_FIELDS) {
    const item = value[key];
    if (item === undefined || item === null) continue; // Unknown does not erase a fact.
    if (key === "present" || key === "notes") {
      if (!Array.isArray(item) || item.length > (key === "notes" ? 8 : 12) ||
        item.some(v => !clean(v, key === "notes" ? 240 : 100) || !v.trim())) return null;
      patch[key] = [...new Set(item.map(v => v.trim()))];
    } else {
      if (!clean(item, key === "details" ? 500 : 240)) return null;
      patch[key] = item.trim();
    }
  }
  return patch;
}

/** key=JSON, one changed field per line. Reject an entire malformed block. */
export function parseBlock(body: string): TrackerPatch | null {
  if (body.length > MAX_BLOCK) return null;
  const values: Record<string, unknown> = Object.create(null);
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const equals = line.indexOf("=");
    const key = line.slice(0, equals).trim();
    if (equals < 1 || Object.hasOwn(values, key)) return null;
    try { values[key] = JSON.parse(decodeEntities(line.slice(equals + 1))); }
    catch { return null; }
  }
  return validatePatch(values);
}

export function parseReply(content: string): ParsedReply {
  const result: ParsedReply = { patch: {}, texts: [], invalidTracker: false, invalidTexts: false };
  const tags = scanTags(content);
  for (const tag of tags.filter(t => !t.name)) {
    const fragment = content.slice(tag.start).toLowerCase();
    if (fragment.startsWith("<phone") || fragment.startsWith("</phone")) {
      if (`<${TRACKER_TAG}`.startsWith(fragment) || `</${TRACKER_TAG}>`.startsWith(fragment)) result.invalidTracker = true;
      if (`<${TEXT_TAG}`.startsWith(fragment) || `</${TEXT_TAG}>`.startsWith(fragment)) result.invalidTexts = true;
    }
  }
  const trackers = tags.filter(t => t.name === TRACKER_TAG);
  if (trackers.length) {
    const tag = trackers[0];
    const patch = trackers.length === 1 && tag.complete && !tag.header.trim() ? parseBlock(tag.body) : null;
    if (patch && !result.invalidTracker) result.patch = patch;
    else result.invalidTracker = true;
  }
  for (const tag of tags.filter(t => t.name === TEXT_TAG)) {
    const attrs = parseAttributes(tag.header);
    const text = decodeEntities(tag.body).trim();
    if (!tag.complete || !attrs || !clean(attrs.from, 100) || !attrs.from.trim() ||
      Object.keys(attrs).some(k => k !== "from" && k !== "time") ||
      (attrs.time !== undefined && !clean(attrs.time, 100)) ||
      !text || text.length > 3000 || tag.body.includes("<") || text.includes("\u0000") || result.texts.length >= 12) {
      result.invalidTexts = true;
      continue;
    }
    result.texts.push({ from: attrs.from.trim(), text, ...(attrs.time?.trim() ? { time: attrs.time.trim() } : {}) });
  }
  return result;
}

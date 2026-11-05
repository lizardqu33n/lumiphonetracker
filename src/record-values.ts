export const placeholder = (s: string) => /^(?:absent|n\/?a|none|unknown|unspecified|not known|not applicable|not stated|not specified|unavailable|offscreen|off-screen|not present|null|undefined|tbd|[?—-])\.?$/i.test(s.trim());
export function recordText(v: unknown, max = 100, wordLimit?: number): string { if (typeof v !== "string" || !v.trim() || v.length > max || /[\r\n\u0000<]/u.test(v) || v.includes(" | ") || placeholder(v) || wordLimit && v.trim().split(/\s+/u).length > wordLimit)
    throw Error("Invalid record"); return v.trim(); }

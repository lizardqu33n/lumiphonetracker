/** CSS is applied only inside the phone's shadow tree, never the host document. */
export function prepareCustomCSS(text: string): string {
  if (text.length > 32000) throw new Error("Keep custom CSS under 32,000 characters.");
  // Reject escape-obfuscated loads and network-capable rules before CSSOM parsing.
  if (text.includes("\\")) throw new Error("CSS escape sequences are not supported.");
  let stripped = ""; let quote = ""; let depth = 0; let comment = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]; const n = text[i + 1];
    if (comment) { if (c === "*" && n === "/") { comment = false; i++; } continue; }
    if (!quote && c === "/" && n === "*") { comment = true; i++; continue; }
    stripped += c;
    if (quote) { if (c === quote) quote = ""; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === "{") depth++;
    else if (c === "}" && --depth < 0) throw new Error("Check the CSS braces.");
  }
  if (quote || comment || depth) throw new Error("Finish the CSS rule, quote, or comment.");
  const lower = stripped.toLowerCase();
  if (["url(", "@import", "@font-face", "://", "image-set(", "@property", "@namespace"].some(t => lower.includes(t))) {
    throw new Error("Use local styles only; imports, links, and font downloads are not supported.");
  }
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(text);
  const check = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.STYLE_RULE) {
        if ((rule as CSSStyleRule).selectorText.includes("::slotted")) throw new Error("Style phone elements only.");
      } else if (rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE) check((rule as CSSGroupingRule).cssRules);
      else throw new Error("Use ordinary CSS rules, @media, or @supports.");
    }
  };
  check(sheet.cssRules);
  if (stripped.trim() && !sheet.cssRules.length) throw new Error("No usable CSS rules were found.");
  return Array.from(sheet.cssRules).map(r => r.cssText).join("\n");
}

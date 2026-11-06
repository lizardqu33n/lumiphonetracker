import {STYLE_FILE_LIMIT} from "./style-files";
/** CSS is applied only inside the phone's shadow tree, never the host document. */
export function prepareCustomCSS(text: string): string {
  if (text.length > STYLE_FILE_LIMIT) throw new Error("Choose a CSS file no larger than 256 KB.");
  // Inspect decoded CSS escapes too, so escaped resource names cannot hide downloads.
  let stripped = ""; let quote = ""; let depth = 0; let comment = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]; const n = text[i + 1];
    if (comment) { if (c === "*" && n === "/") { comment = false; i++; } continue; }
    if (!quote && c === "/" && n === "*") { comment = true; i++; continue; }
    stripped += c;
    if (quote) { if(c==="\\"&&n){stripped+=n;i++;continue;}if (c === quote) quote = ""; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === "{") depth++;
    else if (c === "}" && --depth < 0) throw new Error("Check the CSS braces.");
  }
  if (quote || comment || depth) throw new Error("Finish the CSS rule, quote, or comment.");
  const lower = stripped.replace(/\\(?:\r\n|[\r\n\f])/g, "").replace(/\\([0-9a-fA-F]{1,6})[ \t\r\n\f]?|\\([^\r\n\f])/g,(_all,hex:string|undefined,char:string|undefined)=>hex?String.fromCodePoint(Math.min(0x10ffff,parseInt(hex,16))):char??"").toLowerCase();
  if (/(?:url|image-set|image|src)\s*\(/.test(lower)||["@import", "@font-face", "://", "@property", "@namespace"].some(t => lower.includes(t))) {
    throw new Error("Use local styles only; imports, links, and font downloads are not supported.");
  }
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(text);
  const check = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.STYLE_RULE) {
        if ((rule as CSSStyleRule).selectorText.includes("::slotted")) throw new Error("Style extension content only.");
        const nested=(rule as CSSStyleRule&{cssRules?:CSSRuleList}).cssRules;if(nested?.length)check(nested);
      } else if (rule.type === CSSRule.MEDIA_RULE || rule.type === CSSRule.SUPPORTS_RULE || rule.constructor.name==="CSSContainerRule") check((rule as CSSGroupingRule).cssRules);
      else throw new Error("Use ordinary CSS rules, @media, @supports or @container.");
    }
  };
  check(sheet.cssRules);
  if (stripped.trim() && !sheet.cssRules.length) throw new Error("No usable CSS rules were found.");
  return Array.from(sheet.cssRules).map(r => r.cssText).join("\n");
}

/** CSS scope restricts every subject to our settings subtree; paint containment
 * on its non-customizable parent prevents fixed/oversized children covering Reset. */
export function prepareSidebarCSS(text:string):string {
 if(!text.trim())return "";
 const clean=prepareCustomCSS(text);
 const sheet=new CSSStyleSheet();sheet.replaceSync(clean);
 const rewrite=(rules:CSSRuleList):string=>Array.from(rules).map(rule=>{
  if(rule.type===CSSRule.STYLE_RULE){const style=rule as CSSStyleRule;const selector=style.selectorText.replace(/\.lpt-sidebar(?![-\w])/g,":scope").replace(/:root\b|:host(?![-\w(])/g,":scope");const rootAlias=style.selectorText.trim()!==selector.trim()&&selector.trim()===":scope";
   const declarations=rootAlias?Array.from({length:style.style.length},(_,i)=>style.style.item(i)).filter(key=>key.startsWith("--")||/^(color|background(?:-.+)?|font(?:-.+)?|line-height|letter-spacing|text-.+|border(?:-.+)?|box-shadow)$/.test(key)).map(key=>`${key}:${style.style.getPropertyValue(key)}${style.style.getPropertyPriority(key)?" !important":""};`).join(""):style.style.cssText;
   const nested=(style as CSSStyleRule&{cssRules?:CSSRuleList}).cssRules;return `${selector} { ${declarations} ${nested?.length?rewrite(nested):""} }`;}
  const group=rule as CSSGroupingRule;return `${rule.cssText.slice(0,rule.cssText.indexOf("{"))}{${rewrite(group.cssRules)}}`;
 }).join("\n");
 const scoped=`@scope (.lpt-sidebar-settings) { ${rewrite(sheet.cssRules)} }`;
 const probe=new CSSStyleSheet();probe.replaceSync(scoped);
 if(probe.cssRules[0]?.constructor.name!=="CSSScopeRule")throw Error("This browser does not support safely scoped sidebar styles. Update your browser; the default sidebar still works.");
 return scoped;
}

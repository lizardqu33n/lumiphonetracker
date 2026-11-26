import { chromium, type Page } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir,readFile } from "node:fs/promises";

const result = await Bun.build({ entrypoints: ["tests/browser-harness.ts"], target: "browser" });
if (!result.success) throw new Error(result.logs.join("\n"));
const js = await result.outputs[0].text();
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Phone browser verification</title><style>
:root{--lumiverse-text:#ece9f1;--lumiverse-text-muted:#aaa4b5;--lumiverse-fill:#19171f;--lumiverse-fill-subtle:#24212d;--lumiverse-accent:#b6a1dc;--lumiverse-accent-fg:#17131e;--lumiverse-border:#3a3445;--lumiverse-border-hover:#77648f;--lumiverse-radius:10px;font:14px system-ui;background:#121116;color:var(--lumiverse-text)}
body{margin:0;min-height:100vh}.harness-widget{position:fixed}.harness-drawer{display:flex;flex-direction:column;z-index:10001;position:fixed;right:0;top:0;width:250px;height:100dvh;background:var(--lumiverse-fill)}.harness-drawer p{font-size:12px}.harness-drawer[hidden]{display:none}.harness-drawer-header{flex:none;height:44px;display:flex;align-items:center;padding:0 10px;font-weight:600}.harness-drawer-root{flex:1;min-height:0;padding:12px}

</style></head><body><script type="module" src="/harness.js"></script></body></html>`;
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(req) { return new Response(new URL(req.url).pathname === "/harness.js" ? js : html,
  { headers: { "Content-Type": new URL(req.url).pathname === "/harness.js" ? "text/javascript" : "text/html" } }); } });
const browser = await chromium.launch({ executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", headless: true });
await mkdir(".test-artifacts", { recursive: true });
let checks = 0;let lastCheck="starting";
const check = (condition: unknown, message: string) => { assert.ok(condition, message); checks++;lastCheck=message; };
const ui = (page: Page) => page.locator(".lpt-island, .lpt-sidebar"); // Phone shadow tree plus separate host sidebar.
async function ready(page: Page) { await page.waitForFunction(() => !!document.querySelector(".lpt-island")?.shadowRoot?.querySelector(".lpt-root")); await page.waitForTimeout(80); }
async function seed(page: Page, kind = "story") { await page.evaluate(k => (window as any).harness.seed(k), kind); await ready(page); }
async function section(page:Page,key:string){await page.locator(`.lpt-side-${key}`).evaluate((n:HTMLDetailsElement)=>{n.open=true;n.dispatchEvent(new Event("toggle"));});}
async function pageAppearance(page:Page){await section(page,"appearance");await page.locator(".lpt-side-css-collapse").evaluate((n:HTMLDetailsElement)=>{n.open=true;n.dispatchEvent(new Event("toggle"));});}
async function uploadStyle(page:Page,text:string,target:"phone"|"sidebar"="phone"){await page.locator(target==="phone"?".lpt-phone-css-file":".lpt-sidebar-css-file").setInputFiles({name:target==="phone"?"styles.css":"sidebar.css",mimeType:"text/css",buffer:Buffer.from(text,"utf8")});}
async function settings(page:Page){await section(page,"tracking");}
async function open(page: Page, app?: string) { const launcher=page.locator(".lpt-island").getByRole("button",{name:"Open phone",exact:true});if(await launcher.isVisible())await launcher.click();if(app==="Settings")await settings(page);else if(app)await page.locator(".lpt-island").locator(`[data-app="${app}"]`).click(); }
async function home(page: Page) {const contactBack=page.locator(".lpt-island .lpt-contact-back");if(await contactBack.isVisible())await contactBack.click();const threadBack=page.locator(".lpt-island .lpt-thread-back");if(await threadBack.isVisible())await threadBack.click();const back=page.locator(".lpt-island").getByRole("button",{name:"Back to Home",exact:true});if(await back.isVisible())await back.click(); }
async function save(page: Page) { await ui(page).locator(".lpt-form").getByRole("button", { name: "Save", exact: true }).click(); await page.waitForFunction(() => !document.querySelector(".lpt-island")?.shadowRoot?.querySelector(".lpt-form")); }
try {
 const page=await browser.newPage({viewport:{width:1100,height:850}});await page.goto(`http://127.0.0.1:${server.port}`);await ready(page);await page.getByRole("button",{name:"Add Calls",exact:true}).click();await open(page,"Calls");await page.locator(".harness-widget").screenshot({path:".test-artifacts/calls-empty.png"});
 // Isolated story fixtures only; no real chat data or messages are created.
 await page.evaluate(()=>(window as any).harness.activityStory("<phone-state>call: Unknown caller | missed | 8:10 PM\ncall: Bea | in | 8:15 PM\ncall: Ada | missed | 8:30 PM | x3</phone-state>"));await page.locator(".lpt-call").first().waitFor();await page.waitForTimeout(150);await page.locator(".harness-widget").screenshot({path:".test-artifacts/calls-desktop.png"});
 await page.locator(".lpt-call-summary").nth(1).click();await page.locator(".harness-widget").screenshot({path:".test-artifacts/calls-expanded.png"});
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const m=await mobile.newPage();await m.goto(`http://127.0.0.1:${server.port}`);await ready(m);await m.getByRole("button",{name:"Add Calls",exact:true}).click();await m.locator(".harness-drawer").evaluate((n:HTMLElement)=>n.hidden=true);await open(m,"Calls");await m.evaluate(()=>(window as any).harness.activityStory("<phone-state>call: Unknown caller | missed | 8:10 PM\ncall: Bea | in | 8:15 PM\ncall: Ada | missed | 8:30 PM | x3</phone-state>"));await m.locator(".lpt-call").first().waitFor();await m.waitForTimeout(150);await m.locator(".harness-widget").screenshot({path:".test-artifacts/calls-mobile.png"});await m.setViewportSize({width:390,height:480});await m.waitForTimeout(150);await m.locator(".harness-widget").screenshot({path:".test-artifacts/calls-short.png"});

 const geometry=await page.locator(".lpt-call[open]").first().evaluate(card=>{const r=card.getBoundingClientRect(),buttons=Array.from(card.querySelectorAll<HTMLElement>(".lpt-call-footer button")).map(n=>{const b=n.getBoundingClientRect();return {label:n.getAttribute("aria-label"),left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};});return {height:r.height,buttons};});
 check(geometry.height<=120,"Expanded call cards stay compact");
 check(geometry.buttons.every(b=>b.height>=44&&b.width>=44),"Expanded call actions keep full click targets");
 check(geometry.buttons.every(b=>Math.abs(b.top-geometry.buttons[0].top)<2),"Message, Contact, Edit and Delete share one aligned action row");
 check(await page.getByRole("button",{name:"Go to Home",exact:true}).isVisible(),"The Home soft key is retained");
 const homeButton=page.getByRole("button",{name:"Go to Home",exact:true});
 check((await homeButton.textContent())==="","Home has no visible text label");
 const house=homeButton.locator(".lpt-home-image");await house.evaluate((n:HTMLImageElement)=>n.decode());
 check(await house.evaluate((n:HTMLImageElement)=>n.src.startsWith("data:image/png;base64,")&&n.naturalWidth>0&&n.naturalHeight>0&&getComputedStyle(n).objectFit==="contain"),"Home artwork is embedded and keeps its proportions");
 check(await house.evaluate((n:HTMLImageElement)=>{const c=document.createElement("canvas");c.width=n.naturalWidth;c.height=n.naturalHeight;const ctx=c.getContext("2d")!;ctx.drawImage(n,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;const a=(x:number,y:number)=>d[(y*c.width+x)*4+3]>0;return Array.from({length:c.width},(_,x)=>a(x,0)).some(Boolean)&&Array.from({length:c.width},(_,x)=>a(x,c.height-1)).some(Boolean)&&Array.from({length:c.height},(_,y)=>a(0,y)).some(Boolean)&&Array.from({length:c.height},(_,y)=>a(c.width-1,y)).some(Boolean);}),"Home artwork has no empty transparent border");
 await homeButton.focus();await page.keyboard.press("Enter");check(await page.locator('[data-app="Scene"]').isVisible(),"Home keyboard action still opens Home");
 console.log(JSON.stringify(geometry));console.log(`Compact Calls verification passed: ${checks} checks. Trimmed icons retained.`);
} finally {await browser.close();server.stop(true);}

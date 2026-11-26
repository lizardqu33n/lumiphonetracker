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
 const p=await browser.newPage({viewport:{width:1100,height:850},deviceScaleFactor:2});await p.goto(`http://127.0.0.1:${server.port}`);await ready(p);
 const audit=await p.evaluate(async()=>{
  const {report,groups}=(window as any).harness.croppedArt();const results=[];
  for(const cell of report.assets){const img=new Image();img.src=groups[cell.module][cell.name];await img.decode();const canvas=document.createElement("canvas");canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext("2d")!;ctx.drawImage(img,0,0);const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(rgba[(y*canvas.width+x)*4+3]){minX=Math.min(x,minX);minY=Math.min(y,minY);maxX=Math.max(x,maxX);maxY=Math.max(y,maxY);}results.push({name:cell.module+"/"+cell.name,tight:minX===0&&minY===0&&maxX===canvas.width-1&&maxY===canvas.height-1,size:img.naturalWidth===cell.size[0]&&img.naturalHeight===cell.size[1]});}
  return results;
 });
 check(audit.length===70&&audit.every(a=>a.tight&&a.size),"All 70 embedded images decode with tight alpha bounds and audited sizes at 2x density");
 for(const name of ["Calls","Email","Bank"])await p.getByRole("button",{name:`Add ${name}`,exact:true}).click();await open(p);await p.locator(".harness-widget").screenshot({path:".test-artifacts/cropped-icons-home.png"});
 await open(p,"Scene");check(await p.locator(".lpt-close,.lpt-field-lock").evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.width>=44&&r.height>=44;})),"Header and field controls retain their full click targets after image cropping");await p.locator(".harness-widget").screenshot({path:".test-artifacts/cropped-icons-scene.png"});
 await home(p);await open(p,"Contacts");await p.locator(".lpt-contact-row").filter({hasText:"Ada"}).click();await p.locator(".harness-widget").screenshot({path:".test-artifacts/cropped-icons-contact.png"});
 await home(p);await open(p,"Weather");await p.locator(".harness-widget").screenshot({path:".test-artifacts/cropped-icons-weather.png"});
 await home(p);await open(p,"Contacts");await p.locator(".lpt-contact-row").filter({hasText:"Ada"}).click();await p.getByRole("button",{name:"Message",exact:true}).click();await p.getByRole("button",{name:"Choose emoji",exact:true}).click();await p.locator(".harness-widget").screenshot({path:".test-artifacts/cropped-icons-emoji.png"});
 check(await p.locator(".lpt-emoji-option img").evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).objectFit==="contain")),"Emoji keep their original proportions inside the picker targets");
 console.log(`Cropped icon browser verification passed: ${checks} checks.`);
} finally {await browser.close();server.stop(true);}

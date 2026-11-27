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
try{
 const p=await browser.newPage({viewport:{width:1100,height:850}});await p.goto(`http://127.0.0.1:${server.port}`);await ready(p);
 await section(p,"advanced");const auto=p.getByRole('checkbox',{name:'Always start tracker in new chats',exact:true});check(!await auto.isChecked(),'Auto-start starts off');await auto.check();await p.waitForTimeout(100);check(await auto.isChecked(),'Auto-start preference saves');
 await section(p,"presets");const box=p.locator('.lpt-side-presets');await box.getByLabel('Profile name',{exact:true}).fill('Daily phone');await box.getByRole('button',{name:'Save current as...',exact:true}).click();await p.waitForFunction(()=>!!document.querySelector('.lpt-side-presets option:last-child')?.textContent?.includes('Daily phone'));await box.getByRole('button',{name:'Save changes',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.lpt-personal-status')?.textContent==='Profile updated.');check(true,'Save changes updates existing profile');
 await box.getByLabel('Settings profile',{exact:true}).selectOption('minimal');await box.getByRole('button',{name:'Apply',exact:true}).click();check((await box.locator('.lpt-preset-confirm').innerText()).includes('Hides Contacts'),'Apply previews concrete app changes');await box.locator('.lpt-preset-confirm').getByRole('button',{name:'Cancel',exact:true}).click();
 await open(p,'Scene');await p.getByRole('button',{name:'Edit Time',exact:true}).click();await p.locator('.lpt-form [name="value"]').fill('Dusk');await p.getByRole('button',{name:'Save',exact:true}).click();await p.waitForFunction(()=>(window as any).harness.getDocument().state.scene.time.value==='Dusk');await p.locator('.harness-widget').screenshot({path:'.test-artifacts/usability-undo.png'});check(await p.locator('.lpt-status').textContent()==='Scene updated.','Save feedback names the app');await p.locator('.lpt-undo-button').click();await p.waitForFunction(()=>(window as any).harness.getDocument().state.scene.time.value==='Late afternoon');check(true,'Undo restores the previous manual value');
 await p.getByRole('button',{name:'Go to Home',exact:true}).click();await open(p,'Contacts');await p.locator('.lpt-contact-row').filter({hasText:'Ada'}).click();await p.locator('.lpt-content').evaluate(n=>n.scrollTop=n.scrollHeight);const top=await p.locator('.lpt-content').evaluate(n=>n.scrollTop);await p.getByRole('button',{name:'Close phone',exact:true}).click();await open(p);await p.waitForTimeout(50);check(await p.locator('.lpt-contact-name').textContent()==='Ada','Reopen keeps last app/contact');check(Math.abs(await p.locator('.lpt-content').evaluate(n=>n.scrollTop)-top)<3,'Reopen keeps scroll position');
 await p.getByRole('button',{name:'Close phone',exact:true}).click();await p.evaluate(()=>(window as any).harness.activityStory('<phone-state>time: Night</phone-state>'));await p.waitForTimeout(200);await open(p);await p.waitForTimeout(50);check(Math.abs(await p.locator('.lpt-content').evaluate(n=>n.scrollTop)-top)<3,'Closed background updates preserve the saved scroll position');
 console.log(`Usability browser checks passed: ${checks}`);
}finally{await browser.close();server.stop(true);}

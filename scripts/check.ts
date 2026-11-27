import {readdir} from "node:fs/promises";
import assert from "node:assert/strict";

// Decode source strictly so a successful build cannot hide corrupt Windows-1252 bytes.
for(const name of await readdir("src"))if(/\.(ts|css)$/.test(name)) {
  new TextDecoder("utf-8",{fatal:true}).decode(await Bun.file(`src/${name}`).arrayBuffer());
}
// Manifest and compiled-entry packaging checks; behavioral tests live in tests/.
const manifest = await Bun.file("spindle.json").json();
const pkg = await Bun.file("package.json").json();
assert.equal(manifest.identifier, "lumi_phone_tracker");
assert.equal(manifest.name, "Lumi Phone Tracker");
assert.equal(manifest.version, pkg.version);
for (const key of ["version", "name", "identifier", "author", "github", "homepage"]) {
  assert.equal(typeof manifest[key], "string", `${key} must be a string`);
  assert.ok(manifest[key].length > 0, `${key} must be filled in`);
}
assert.equal(new URL(manifest.github).hostname, "github.com");
assert.equal(new URL(manifest.homepage).protocol, "https:");
assert.deepEqual(manifest.permissions, ["chats", "chat_mutation", "interceptor", "ui_panels", "generation", "macro_interceptor", "characters", "personas", "world_books", "images"].filter(p=>manifest.entry_backend!=="dist/backend-no-macros.js"||p!=="macro_interceptor"));
assert.ok(["dist/backend.js","dist/backend-no-macros.js"].includes(manifest.entry_backend));
assert.equal(manifest.entry_frontend, "dist/frontend.js");
for (const key of ["entry_backend", "entry_frontend"]) {
  assert.ok(await Bun.file(manifest[key]).exists(), `${manifest[key]} must exist`);
}
const frontendSource=await Bun.file(manifest.entry_frontend).text();
assert.ok(Bun.file(manifest.entry_frontend).size<=2_500_000,"Frontend bundle exceeded the 2.5 MB embedded-asset budget");
assert.ok(!/\bcrypto\s*\.\s*randomUUID\s*\(/.test(frontendSource), "Frontend must not call the blocked direct ID API");
const frontend = await import(`../${manifest.entry_frontend}`);
assert.equal(typeof frontend.setup, "function", "Frontend must export setup(ctx)");
console.log("Manifest, built entry files, and frontend export: passed.");
console.log("This does not validate installation in Lumiverse.");

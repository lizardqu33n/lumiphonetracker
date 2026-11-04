import assert from "node:assert/strict";

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
assert.deepEqual(manifest.permissions, ["chats", "chat_mutation", "interceptor", "ui_panels", "generation"]);
assert.equal(manifest.entry_backend, "dist/backend.js");
assert.equal(manifest.entry_frontend, "dist/frontend.js");
for (const key of ["entry_backend", "entry_frontend"]) {
  assert.ok(await Bun.file(manifest[key]).exists(), `${manifest[key]} must exist`);
}
const frontend = await import(`../${manifest.entry_frontend}`);
assert.equal(typeof frontend.setup, "function", "Frontend must export setup(ctx)");
console.log("Step 6 manifest, entry files, and frontend export: passed.");
console.log("This does not validate installation in Lumiverse.");

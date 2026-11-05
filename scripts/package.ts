import { mkdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

// Include an explicit allowlist; never package dependencies or personal inputs.
const files = [
  "spindle.json", "package.json", "package-lock.json", "tsconfig.json", ".gitignore",
  "README.md", "INSTALL.md", "TESTING.md", "docs/ARCHITECTURE.md", "docs/BLOCK-FORMAT.md", "docs/PRESET-SNIPPET.txt",
  "docs/TOP-STRIP-SIDEBAR.md", "docs/PORTRAITS-THREADS.md", "docs/PART-4.md", "docs/PART-3.md", "docs/PART-2.md", "docs/USER-DOCS-REVIEW.md", "docs/TOKEN-REPORT.md", "docs/TOKEN-SAMPLES.json", "STYLING.md", "THIRD-PARTY-NOTICES.md", "licenses/LUCIDE-LICENSE.txt", "src/icons.ts", "src/launcher-icon.ts", "docs/REQUIREMENTS.md", "docs/FINAL-ADDITIONS.md", "docs/STEP-3.md",
  "src/ui-icons.ts", "src/portraits.ts", "src/portrait-sources.ts", "src/calls.ts", "src/activity.ts", "src/record-values.ts", "src/app-icons.ts", "src/sidebar.ts", "src/sidebar.css", "src/backend.ts", "src/frontend.ts", "src/shared.ts", "src/tags.ts", "src/parser.ts", "src/history.ts", "src/store.ts",
  "src/model.ts", "src/schema.ts", "src/engine.ts", "src/phone-store.ts", "src/phone-macros.ts", "src/retention.ts",
  "src/shorthand.ts", "src/diagnostics.ts", "src/preferences.ts", "src/custom-css.ts", "src/phone-view.ts", "src/styles.css", "src/assets.d.ts", "src/messages.ts", "src/message-reads.ts", "src/helper.ts", "src/helper-status.ts",
  "tests/ui-icons.test.ts", "tests/portraits.test.ts", "tests/calls.test.ts", "tests/part4.test.ts", "tests/part3.test.ts", "tests/shorthand.test.ts", "tests/tracker.test.ts", "tests/integration.test.ts", "tests/step3.test.ts", "tests/step4.test.ts", "tests/step5.test.ts", "tests/step6.test.ts", "tests/browser-harness.ts",
  "dist/backend.js", "dist/frontend.js",
  "scripts/build.ts", "scripts/check.ts", "scripts/package.ts", "scripts/test-ui.ts", "docs/STEP-4.md", "docs/STEP-5.md", "docs/STEP-6.md", "docs/STEP-5-TESTING.md", "CHANGELOG.md", "docs/STEP-4-TESTING.md", "docs/FIX-0.4.2.md", "docs/STEP-3-TESTING.md",
];
execFileSync(process.execPath, ["run", "typecheck"], { stdio: "inherit" });
execFileSync(process.execPath, ["run", "test"], { stdio: "inherit" });
execFileSync(process.execPath, ["run", "check:dist"], { stdio: "inherit" });
execFileSync(process.execPath, ["run", "check"], { stdio: "inherit" });
const entries: Record<string, Uint8Array> = {};
for (const file of files) entries[`Lumi-Phone-Tracker/${file}`] = await readFile(file);
await mkdir("release", { recursive: true });
const version = JSON.parse(await readFile("package.json", "utf8")).version as string;
const path = `release/Lumi-Phone-Tracker-v${version}.tar.gz`;
await Bun.Archive.write(path, entries, { compress: "gzip" });
console.log(`Created ${path} (source, built files, tests and guides).`);

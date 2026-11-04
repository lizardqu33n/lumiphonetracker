import { mkdir } from "node:fs/promises";

const checkOnly = process.argv.includes("--check");
if (!checkOnly) await mkdir("dist", { recursive: true });

for (const [entry, target] of [
  ["backend", "bun"],
  ["frontend", "browser"],
] as const) {
  const result = await Bun.build({
    entrypoints: [`src/${entry}.ts`],
    target,
    minify: false,
    sourcemap: "none",
  });
  if (!result.success || result.outputs.length !== 1) {
    throw new Error(`Cannot build ${entry}: ${result.logs.join("\n")}`);
  }
  const output = result.outputs[0];
  const path = `dist/${entry}.js`;
  if (checkOnly) {
    if (!(await Bun.file(path).exists()) || (await Bun.file(path).text()) !== (await output.text())) {
      throw new Error(`${path} is missing or differs from the source. Run bun run build.`);
    }
    console.log(`${path}: matches source`);
  } else {
    await Bun.write(path, output);
    console.log(`Built ${path}`);
  }
}

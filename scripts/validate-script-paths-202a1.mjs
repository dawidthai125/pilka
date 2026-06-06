import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skip = new Set(["validate-doc-links-202a1.mjs", "validate-script-paths-202a1.mjs"]);

const pathRe = /["'](docs\/[^"']+)["']/g;

const missing = [];
for (const name of readdirSync(join(root, "scripts")).filter((f) => f.endsWith(".mjs") && !skip.has(f))) {
  const text = readFileSync(join(root, "scripts", name), "utf8");
  let m;
  while ((m = pathRe.exec(text)) !== null) {
    const p = m[1];
    if (p.includes("*")) continue;
    const ctx = text.slice(Math.max(0, m.index - 100), m.index + 100);
    if (/writeFileSync|writeFile/.test(ctx)) continue;
    if (!existsSync(join(root, p))) missing.push({ script: name, path: p });
  }
}

console.log(JSON.stringify({ missingCount: missing.length, missing }, null, 2));
process.exit(missing.length ? 1 : 0);

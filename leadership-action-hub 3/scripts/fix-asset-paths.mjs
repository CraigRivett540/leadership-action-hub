/**
 * Post-build: rewrite client chunk paths to root-absolute `/assets/…`.
 *
 * Published deploys load the entry from `/assets/index-….js`. Relative
 * mapDeps entries like `assets/routes-….js` then resolve to
 * `/assets/assets/routes-….js` (404) → JS never hydrates → dead buttons.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DIRS = [
  path.join(ROOT, ".vercel/output/static/assets"),
  path.join(ROOT, "dist/client/assets"),
  path.join(ROOT, "dist/assets"),
];

async function fixDir(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  let fixed = 0;
  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.endsWith(".js")) continue;
    const file = path.join(dir, ent.name);
    const before = await readFile(file, "utf8");
    // "assets/foo.js" or 'assets/foo.js' → "/assets/foo.js"
    // also fix bare assets/ without quotes in import() if present
    let after = before.replace(/(["'])assets\/([^"']+\.js)\1/g, "$1/assets/$2$1");
    after = after.replace(
      /import\(\s*(["'])assets\/([^"']+)\1\s*\)/g,
      "import($1/assets/$2$1)",
    );
    if (after !== before) {
      await writeFile(file, after, "utf8");
      fixed += 1;
      console.log(`[fix-asset-paths] rewrote ${path.relative(ROOT, file)}`);
    }
  }
  return fixed;
}

let total = 0;
for (const dir of DIRS) {
  total += await fixDir(dir);
}
console.log(`[fix-asset-paths] done — ${total} file(s) updated`);

// tsc rewrites relative import extensions but not `new URL("./x.ts",
// import.meta.url)` specifiers, which bundlers use to locate worker entries.
// Point them at the compiled files instead.
import fs from "node:fs";
import path from "node:path";

const DIST = path.resolve(import.meta.dirname, "../dist/esm");
const PATTERN =
  /(new URL\(\s*["'])(\.{1,2}\/[^"']+)\.(ts|tsx|mts)(["']\s*,\s*import\.meta\.url\s*\))/g;
const EXTENSIONS = { mts: "mjs", ts: "js", tsx: "js" };

for (const entry of fs.readdirSync(DIST, {
  recursive: true,
  withFileTypes: true,
})) {
  if (!entry.isFile() || !/\.m?js$/.test(entry.name)) continue;
  const file = path.join(entry.parentPath, entry.name);
  const contents = fs.readFileSync(file, "utf8");
  const rewritten = contents.replace(
    PATTERN,
    (_match, before, specifier, extension, after) =>
      `${before}${specifier}.${EXTENSIONS[extension]}${after}`,
  );
  if (rewritten !== contents) fs.writeFileSync(file, rewritten);
}

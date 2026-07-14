#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

console.log("🧹 Running ESLint auto-fix (safe mode)...");

try {
  execSync("npx eslint . --fix --ext .ts,.tsx", { stdio: "inherit" });
} catch (e) {
  console.warn("⚠️ ESLint completed with warnings or errors (expected).");
}

// === Custom Safe Fixes === //

/**
 * Replace 'any' with 'unknown' in non-JSX, non-import contexts.
 */
const replaceAny = (filePath) => {
  const code = fs.readFileSync(filePath, "utf8");

  // Skip import lines and JSX by matching line patterns.
  const lines = code.split("\n").map((line) => {
    if (
      line.trim().startsWith("import") ||
      line.trim().startsWith("from") ||
      line.includes("<") ||
      line.includes(">")
    ) {
      return line;
    }
    return line.replace(/\bany\b/g, "unknown");
  });

  fs.writeFileSync(filePath, lines.join("\n"));
};

const glob = (dir) =>
  fs
    .readdirSync(dir)
    .flatMap((f) => {
      const p = path.join(dir, f);
      return fs.statSync(p).isDirectory() ? glob(p) : [p];
    })
    .filter((f) => /\.(ts|tsx)$/.test(f));

// === Patch empty interfaces and types === //
const patchEmptyTypes = (filePath) => {
  let code = fs.readFileSync(filePath, "utf8");
  code = code.replace(/interface\s+\w+\s*{\s*}/g, "type $1 = object;");
  code = code.replace(/type\s+\w+\s*=\s*{}/g, "type $1 = object;");
  fs.writeFileSync(filePath, code);
};

console.log("🔍 Fixing unsafe 'any' usage...");
const files = glob("./src");
files.forEach((file) => replaceAny(file));

console.log("🔧 Patching empty type definitions...");
files.forEach((file) => {
  if (file.endsWith(".d.ts")) patchEmptyTypes(file);
});

console.log("✅ Safe cleanup complete!");
console.log("Next steps:");
console.log("  1️⃣ Run: npm run lint --silent");
console.log("  2️⃣ Run: npm run build");
console.log("  3️⃣ Fix any remaining quote escapes manually (just JSX text)");

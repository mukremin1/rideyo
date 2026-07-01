#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { loadEnv, projectRoot } from "./load-env.mjs";

const dist = path.join(projectRoot, "dist");
const env = loadEnv("production");
const expectedUrl = env.VITE_SUPABASE_URL?.trim();

if (!expectedUrl) {
  console.error("✗ VITE_SUPABASE_URL missing — run validate-env first");
  process.exit(1);
}

if (!fs.existsSync(dist)) {
  console.error("✗ dist/ not found — run npm run build first");
  process.exit(1);
}

const htmlPath = path.join(dist, "index.html");
const html = fs.readFileSync(htmlPath, "utf8");
const assetsDir = path.join(dist, "assets");

const scriptSrc = html.match(/src="([^"]+\.js)"/)?.[1] ?? "";
const errors = [];

if (!scriptSrc.startsWith("/assets/") && !scriptSrc.startsWith("./assets/")) {
  errors.push(`unexpected script path in index.html: ${scriptSrc || "(missing)"}`);
}

if (scriptSrc.includes("tiktak-turkiye-rent")) {
  errors.push("stale base path /tiktak-turkiye-rent/ detected in index.html");
}

if (!fs.existsSync(path.join(dist, "404.html"))) {
  errors.push("dist/404.html missing — GitHub Pages SPA routing will break");
}

const jsFiles = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir).filter((f) => f.endsWith(".js"))
  : [];

if (!jsFiles.length) {
  errors.push("no JS assets found in dist/assets");
}

for (const file of jsFiles) {
  const content = fs.readFileSync(path.join(assetsDir, file), "utf8");
  if (content.includes("undefined/functions")) {
    errors.push(`${file} contains broken undefined/functions URL`);
  }
}

const scriptFile = path.basename(scriptSrc);
if (scriptFile && fs.existsSync(path.join(assetsDir, scriptFile))) {
  const bundle = fs.readFileSync(path.join(assetsDir, scriptFile), "utf8");
  if (!bundle.includes(expectedUrl)) {
    errors.push(`${scriptFile} does not embed ${expectedUrl}`);
  }
} else {
  errors.push(`entry script bundle not found: ${scriptFile || "(missing)"}`);
}

if (html.includes("lovable.dev")) {
  errors.push("dist/index.html still references lovable.dev");
}

if (!html.includes("favicon.ico")) {
  errors.push("dist/index.html missing favicon link");
}

if (errors.length) {
  console.error("\n✗ Production build verification failed:\n");
  for (const err of errors) console.error(`  • ${err}`);
  process.exit(1);
}

console.log("✓ Production build verified");
console.log(`  script: ${scriptSrc}`);
console.log(`  supabase: ${expectedUrl}`);

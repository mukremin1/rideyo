#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "./load-env.mjs";

const index = path.join(projectRoot, "dist", "index.html");
const fallback = path.join(projectRoot, "dist", "404.html");

if (!fs.existsSync(index)) {
  console.error("✗ dist/index.html not found");
  process.exit(1);
}

fs.copyFileSync(index, fallback);
console.log("✓ Created dist/404.html for SPA routing");

#!/usr/bin/env node
import { copyFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const example = resolve(root, ".env.example");
const target = resolve(root, ".env");

if (existsSync(target)) {
  console.log(".env already exists — skipped.");
  process.exit(0);
}

if (!existsSync(example)) {
  console.error(".env.example not found.");
  process.exit(1);
}

copyFileSync(example, target);
console.log("Created .env from .env.example — fill in your Supabase keys.");

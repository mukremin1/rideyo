#!/usr/bin/env node
import { loadEnv } from "./load-env.mjs";

const mode = process.argv.includes("--mode=development") ? "development" : "production";
const env = loadEnv(mode);

const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
const errors = [];

for (const key of required) {
  const value = env[key]?.trim();
  if (!value || value === "undefined" || value.includes("your-")) {
    errors.push(`${key} is missing or still a placeholder`);
    continue;
  }
  if (key === "VITE_SUPABASE_URL") {
    if (!value.startsWith("https://") || !value.includes(".supabase.co")) {
      errors.push(`${key} must be a valid https://*.supabase.co URL`);
    }
  }
  if (key === "VITE_SUPABASE_PUBLISHABLE_KEY" && value.length < 20) {
    errors.push(`${key} looks too short`);
  }
}

if (mode === "production" && env.VITE_SERVER_API_URL?.includes("localhost")) {
  errors.push("VITE_SERVER_API_URL must not point to localhost in production builds");
}

if (errors.length) {
  console.error(`\n✗ Environment validation failed (${mode}):\n`);
  for (const err of errors) console.error(`  • ${err}`);
  console.error(
    mode === "production"
      ? "\n→ Ensure .env.production exists or set VITE_* vars before npm run build.\n"
      : "\n→ Run npm run env:init and fill .env with Supabase keys.\n",
  );
  process.exit(1);
}

console.log(`✓ Environment OK (${mode})`);

#!/usr/bin/env node
/**
 * Deploy payment migration + edge functions to Supabase.
 *
 * Prerequisites:
 *   npx supabase login
 *   # or: set SUPABASE_ACCESS_TOKEN=your_token
 *
 * Optional secrets (set in Supabase Dashboard → Edge Functions → Secrets):
 *   IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_SANDBOX=true
 *   APP_URL, IYZICO_CALLBACK_BASE_URL, PLATFORM_COMMISSION_RATE=0.15
 *   PAYMENT_DEMO_MODE=false  (production)
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = "ucjnonpozhzuyjuowwdx";

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function npxSupabase(args) {
  run("npx", ["supabase", ...args]);
}

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.log("SUPABASE_ACCESS_TOKEN yok — önce: npx supabase login");
}

if (!existsSync(join(root, "supabase", ".temp"))) {
  console.log(`Proje bağlanıyor: ${projectRef}`);
  npxSupabase(["link", "--project-ref", projectRef]);
}

console.log("\n=== 1/2 Migration push ===");
npxSupabase(["db", "push"]);

console.log("\n=== 2/2 Edge functions deploy ===");
const functions = [
  "process-payment",
  "payment-callback",
  "refund-payment",
  "register-submerchant",
  "vehicle-control",
  "verify-license",
];

for (const fn of functions) {
  npxSupabase(["functions", "deploy", fn, "--no-verify-jwt"]);
}

console.log("\n✓ Ödeme altyapısı deploy edildi.");
console.log("\nSecrets (Dashboard veya CLI):");
console.log("  npx supabase secrets set IYZICO_API_KEY=... IYZICO_SECRET_KEY=... IYZICO_SANDBOX=true");
console.log(`  npx supabase secrets set APP_URL=https://your-app.com`);
console.log(
  `  npx supabase secrets set IYZICO_CALLBACK_BASE_URL=https://${projectRef}.supabase.co/functions/v1/payment-callback`,
);

#!/usr/bin/env node
/**
 * RideYo production deploy checklist — durum kontrolü.
 * Kullanım: node scripts/deploy-checklist.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = "ucjnonpozhzuyjuowwdx";
const supabaseUrl = `https://${projectRef}.supabase.co`;

const checks = [];

function pass(name, detail) {
  checks.push({ ok: true, name, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail, action) {
  checks.push({ ok: false, name, detail, action });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  if (action) console.log(`    → ${action}`);
}

function warn(name, detail) {
  console.log(`  ! ${name}${detail ? ` — ${detail}` : ""}`);
}

console.log("\n=== RideYo Deploy Checklist ===\n");

// 1. Supabase CLI token
if (process.env.SUPABASE_ACCESS_TOKEN) {
  pass("SUPABASE_ACCESS_TOKEN", "ortam değişkeni mevcut");
} else {
  fail(
    "SUPABASE_ACCESS_TOKEN",
    "eksik",
    "https://supabase.com/dashboard/account/tokens → token al → GitHub Secret veya: $env:SUPABASE_ACCESS_TOKEN='sbp_...'",
  );
}

// 2. Local .env
const envPath = resolve(root, ".env");
if (existsSync(envPath)) {
  const env = readFileSync(envPath, "utf8");
  if (env.includes("VITE_SUPABASE_URL")) pass(".env VITE_SUPABASE_URL", "ok");
  else fail(".env", "VITE_SUPABASE_URL eksik");

  if (env.includes("VITE_SERVER_API_URL")) {
    warn(".env VITE_SERVER_API_URL", "mobil build öncesi kaldır/yorumla");
  } else {
    pass(".env mobil", "VITE_SERVER_API_URL yok — APK için doğru");
  }
} else {
  fail(".env", "dosya bulunamadı");
}

// 3. Migration file
const migration = resolve(root, "supabase/migrations/20260625000006_payment_infrastructure.sql");
if (existsSync(migration)) pass("Payment migration", "dosya hazır");
else fail("Payment migration", "eksik");

// 4. Edge functions
const functions = [
  "process-payment",
  "payment-callback",
  "refund-payment",
  "register-submerchant",
  "vehicle-control",
  "verify-license",
];
for (const fn of functions) {
  const p = resolve(root, `supabase/functions/${fn}/index.ts`);
  if (existsSync(p)) pass(`Function ${fn}`, "kaynak mevcut");
  else fail(`Function ${fn}`, "eksik");
}

// 5. GitHub workflow
const workflow = resolve(root, ".github/workflows/supabase-deploy.yml");
if (existsSync(workflow)) pass("GitHub Actions workflow", "supabase-deploy.yml");
else fail("GitHub Actions workflow", "eksik");

// 6. Remote health (edge functions reachable)
try {
  const res = await fetch(`${supabaseUrl}/functions/v1/process-payment`, { method: "OPTIONS" });
  if (res.ok || res.status === 204 || res.status === 405) {
    pass("Supabase edge endpoint", "erişilebilir");
  } else {
    warn("Supabase edge endpoint", `HTTP ${res.status}`);
  }
} catch (e) {
  warn("Supabase edge endpoint", "ağ kontrolü yapılamadı");
}

console.log("\n=== Sonraki adımlar (sırayla) ===\n");
console.log("1. Token al:  https://supabase.com/dashboard/account/tokens");
console.log("2. GitHub Secret ekle:");
console.log("   https://github.com/mukremin1/rideyo/settings/secrets/actions");
console.log("   Name: SUPABASE_ACCESS_TOKEN");
console.log("3. Workflow çalıştır:");
console.log("   https://github.com/mukremin1/rideyo/actions/workflows/supabase-deploy.yml");
console.log("   → Run workflow");
console.log("\n4. iyzico sandbox secrets (Supabase Dashboard → Edge Functions → Secrets):");
console.log("   IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_SANDBOX=true");
console.log(`   IYZICO_CALLBACK_BASE_URL=${supabaseUrl}/functions/v1/payment-callback`);
console.log("   APP_URL=https://mukremin1.github.io/rideyo  (veya kendi domain)");
console.log("   PLATFORM_COMMISSION_RATE=0.15");
console.log("   PAYMENT_DEMO_MODE=false");
console.log("\n5. Manuel deploy (token varsa local):");
console.log("   $env:SUPABASE_ACCESS_TOKEN='sbp_...'");
console.log("   npm run supabase:deploy:payment");
console.log("\n6. Test:");
console.log("   - Rezervasyon → ödeme (sandbox kart)");
console.log("   - /owner/payout → araç sahibi IBAN");
console.log("   - Kiralama bitir → provizyon iade");
console.log("\n7. Mobil APK build:");
console.log("   .env'den VITE_SERVER_API_URL satırını kaldır");
console.log("   npm run build:mobile && npx cap sync android");

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n=== Özet: ${checks.length - failed}/${checks.length} otomatik kontrol geçti ===\n`);
process.exit(failed > 0 ? 1 : 0);

#!/usr/bin/env node
/**
 * Grant admin role and confirm email via Supabase service role.
 * Usage:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="..." ; node scripts/grant-admin.mjs mukremin.cakmak.da@gmail.com
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env.mjs";

const email = (process.argv[2] || "mukremin.cakmak.da@gmail.com").trim().toLowerCase();
const env = loadEnv("production");
const url = process.env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("\n✗ SUPABASE_SERVICE_ROLE_KEY required.");
  console.error("  Dashboard → Project Settings → API → service_role");
  console.error("  Or run: npm run supabase:migrate\n");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: listData, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listError) {
  console.error("✗ Could not list users:", listError.message);
  process.exit(1);
}

const user = listData.users.find((u) => u.email?.toLowerCase() === email);
if (!user) {
  console.error(`✗ User not found: ${email}`);
  console.error("  Register at /auth first, then run this script again.\n");
  process.exit(1);
}

const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
  email_confirm: true,
});

if (updateError) {
  console.error("✗ Could not confirm email:", updateError.message);
  process.exit(1);
}

const { error: roleError } = await admin.from("user_roles").upsert(
  { user_id: user.id, role: "admin" },
  { onConflict: "user_id,role" },
);

if (roleError) {
  console.error("✗ Could not grant admin role:", roleError.message);
  process.exit(1);
}

console.log(`\n✓ ${email}`);
console.log(`  user_id: ${user.id}`);
console.log("  email confirmed: yes");
console.log("  role: admin\n");

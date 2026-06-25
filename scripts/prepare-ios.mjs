#!/usr/bin/env node
/**
 * RideYo iOS hazırlık scripti (Mac'te çalıştırın).
 * 1) Web build + native asset üretimi
 * 2) Capacitor iOS sync + CocoaPods
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { cwd: root, stdio: "inherit" });
}

run("npm run assets:mobile");
run("npm run build:mobile");
run("npx cap sync ios");

console.log("\nRideYo iOS projesi hazır.");
console.log("Sonraki adımlar (Mac + Xcode):");
console.log("  1. npm run ios:open");
console.log("  2. Signing & Capabilities → Team seçin");
console.log("  3. Push Notifications + NFC Tag Reading yeteneklerini doğrulayın");
console.log("  4. Product → Archive → App Store Connect'e yükleyin");

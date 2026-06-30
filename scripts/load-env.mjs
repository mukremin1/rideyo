import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseEnvFile(content) {
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/** Mirrors Vite env file precedence for the given mode. */
export function loadEnv(mode = "production") {
  const files =
    mode === "development"
      ? [".env", ".env.local", ".env.development", ".env.development.local"]
      : [".env", ".env.local", ".env.production", ".env.production.local"];

  const merged = {};
  for (const file of files) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;
    Object.assign(merged, parseEnvFile(readFileSync(path, "utf8")));
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("VITE_") && value) merged[key] = value;
  }

  return merged;
}

export const projectRoot = root;

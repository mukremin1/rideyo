const PLACEHOLDER_PATTERN = /your-|changeme|example|placeholder/i;

function readEnv(key: "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY"): string {
  const raw = import.meta.env[key];
  if (typeof raw !== "string") return "";
  const value = raw.trim();
  if (!value || value === "undefined" || PLACEHOLDER_PATTERN.test(value)) return "";
  return value;
}

export type SupabaseConfig =
  | { ok: true; url: string; key: string }
  | { ok: false; message: string };

export function getSupabaseConfig(): SupabaseConfig {
  const url = readEnv("VITE_SUPABASE_URL");
  const key = readEnv("VITE_SUPABASE_PUBLISHABLE_KEY");

  if (!url || !key) {
    return {
      ok: false,
      message:
        "Supabase yapılandırması eksik. .env veya .env.production dosyasında VITE_SUPABASE_URL ve VITE_SUPABASE_PUBLISHABLE_KEY tanımlı olmalı.",
    };
  }

  if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
    return {
      ok: false,
      message: "VITE_SUPABASE_URL geçersiz. https://proje-ref.supabase.co formatında olmalı.",
    };
  }

  return { ok: true, url, key };
}

export const appConfig = getSupabaseConfig();

export function getSupabaseFunctionsUrl(fn: string): string {
  const config = getSupabaseConfig();
  if (!config.ok) return "";
  return `${config.url}/functions/v1/${fn.replace(/^\//, "")}`;
}

export function getSupabaseAnonKey(): string {
  const config = getSupabaseConfig();
  return config.ok ? config.key : "";
}

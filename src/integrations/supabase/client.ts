import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { appConfig, getSupabaseConfig } from "@/lib/appConfig";

let client: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (client) return client;
  const config = getSupabaseConfig();
  if (!config.ok) {
    throw new Error(config.message);
  }
  client = createClient<Database>(config.url, config.key, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return client;
}

export const isSupabaseConfigured = appConfig.ok;

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const instance = getClient();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

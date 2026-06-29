/// <reference types="vite/client" />

declare module "*.json" {
  const value: Record<string, unknown>;
  export default value;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_PAYMENT_API_URL?: string;
  readonly VITE_SERVER_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

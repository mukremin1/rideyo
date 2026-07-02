import type { EmailOtpType } from "@supabase/supabase-js";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export type AuthCallbackParams = {
  code: string | null;
  token_hash: string | null;
  type: EmailOtpType | null;
  access_token: string | null;
  error: string | null;
};

function readParam(search: URLSearchParams, hash: URLSearchParams, key: string): string | null {
  return search.get(key) ?? hash.get(key);
}

export function parseAuthCallbackParams(): AuthCallbackParams {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const typeRaw = readParam(search, hash, "type");

  return {
    code: readParam(search, hash, "code"),
    token_hash: readParam(search, hash, "token_hash"),
    type: typeRaw && OTP_TYPES.has(typeRaw as EmailOtpType) ? (typeRaw as EmailOtpType) : null,
    access_token: readParam(search, hash, "access_token"),
    error: readParam(search, hash, "error_description") ?? readParam(search, hash, "error"),
  };
}

export function hasAuthCallbackParams(): boolean {
  const params = parseAuthCallbackParams();
  if (params.error || params.code || params.token_hash || params.access_token) {
    return true;
  }

  const hash = window.location.hash;
  const search = window.location.search;
  return (
    hash.includes("access_token=") ||
    hash.includes("type=signup") ||
    hash.includes("type=recovery") ||
    search.includes("code=") ||
    search.includes("token_hash=")
  );
}

export function isPkceVerifierError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("pkce") || lower.includes("code verifier") || lower.includes("verifier");
}

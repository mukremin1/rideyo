import { supabase } from "@/integrations/supabase/client";
import { getAuthRedirectUrl } from "@/lib/authRedirect";

export type VerificationSendResult =
  | { ok: true; method: "edge" | "resend" | "magic_link" }
  | { ok: false; code: string; message: string };

type EdgeResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
};

/** Send signup verification email (edge function → resend → magic link fallback). */
export async function sendVerificationEmail(email: string): Promise<VerificationSendResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { ok: false, code: "missing_email", message: "E-posta adresi gerekli." };
  }

  const redirectTo = getAuthRedirectUrl("/");

  try {
    const { data, error } = await supabase.functions.invoke<EdgeResponse>("resend-verification", {
      body: { email: normalized, redirectTo },
    });

    if (!error && data?.ok) {
      return { ok: true, method: "edge" };
    }

    if (data?.code === "already_confirmed") {
      return { ok: false, code: "already_confirmed", message: data.message ?? "E-posta zaten doğrulanmış." };
    }

    if (data?.code === "not_found") {
      return { ok: false, code: "not_found", message: data.message ?? "Bu e-posta ile kayıt bulunamadı." };
    }
  } catch {
    // Edge function may not be deployed yet — fall through to client auth APIs.
  }

  const { error: resendError } = await supabase.auth.resend({
    type: "signup",
    email: normalized,
    options: { emailRedirectTo: redirectTo },
  });

  if (!resendError) {
    return { ok: true, method: "resend" };
  }

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  });

  if (!otpError) {
    return { ok: true, method: "magic_link" };
  }

  return {
    ok: false,
    code: "send_failed",
    message: otpError.message || resendError.message || "Doğrulama e-postası gönderilemedi.",
  };
}

/** Supabase hides duplicate signups: empty identities means account already exists. */
export function isDuplicateSignupUser(user: { identities?: unknown[] } | null | undefined): boolean {
  return Boolean(user && (!user.identities || user.identities.length === 0));
}

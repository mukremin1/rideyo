import { supabase } from "@/integrations/supabase/client";
import { getAuthRedirectUrl } from "@/lib/authRedirect";

export type VerificationSendResult =
  | { ok: true; method: "edge" | "resend" | "magic_link"; uncertain?: boolean }
  | { ok: false; code: string; message: string };

type EdgeResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  method?: string;
  warning?: string;
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

    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("not found") || msg.includes("404") || msg.includes("non-2xx")) {
        return {
          ok: false,
          code: "edge_not_deployed",
          message:
            "Doğrulama mail servisi henüz aktif değil. Supabase panelinden e-posta doğrulamayı kapatın veya SMTP/Resend ayarlayın.",
        };
      }
    }

    if (data?.ok) {
      return {
        ok: true,
        method: "edge",
        uncertain: Boolean(data.warning),
      };
    }

    if (data?.code === "already_confirmed") {
      return { ok: false, code: "already_confirmed", message: data.message ?? "E-posta zaten doğrulanmış." };
    }

    if (data?.code === "not_found") {
      return { ok: false, code: "not_found", message: data.message ?? "Bu e-posta ile kayıt bulunamadı." };
    }

    if (data?.code === "send_failed" || data?.code === "link_failed") {
      return { ok: false, code: data.code, message: data.message ?? "E-posta gönderilemedi." };
    }
  } catch {
    return {
      ok: false,
      code: "edge_not_deployed",
      message:
        "Doğrulama mail servisi henüz aktif değil. Supabase panelinden e-posta doğrulamayı kapatın veya SMTP/Resend ayarlayın.",
    };
  }

  const { error: resendError } = await supabase.auth.resend({
    type: "signup",
    email: normalized,
    options: { emailRedirectTo: redirectTo },
  });

  if (!resendError) {
    return {
      ok: true,
      method: "resend",
      uncertain: true,
    };
  }

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  });

  if (!otpError) {
    return {
      ok: true,
      method: "magic_link",
      uncertain: true,
    };
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

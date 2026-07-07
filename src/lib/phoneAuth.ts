import { supabase } from "@/integrations/supabase/client";

/** Turkish mobile → E.164 (+905XXXXXXXXX) */
export function normalizeTurkishPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("90")) {
    const national = digits.slice(2);
    if (national.length === 10 && national.startsWith("5")) {
      return `+${digits}`;
    }
    return null;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    const national = digits.slice(1);
    if (national.length === 10 && national.startsWith("5")) {
      return `+90${national}`;
    }
    return null;
  }

  if (digits.length === 10 && digits.startsWith("5")) {
    return `+90${digits}`;
  }

  return null;
}

export function formatPhoneForDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  return e164;
}

type SendOtpResponse = {
  ok?: boolean;
  error?: string;
  demo?: boolean;
  debug_code?: string;
};

type VerifyOtpResponse = {
  ok?: boolean;
  error?: string;
  token_hash?: string;
};

export async function sendPhoneLoginOtp(phoneE164: string): Promise<SendOtpResponse> {
  const { data, error } = await supabase.functions.invoke<SendOtpResponse>("send-phone-otp", {
    body: { phone: phoneE164 },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.ok) {
    throw new Error(data?.error || "SMS kodu gonderilemedi");
  }

  return data;
}

export async function verifyPhoneLoginOtp(phoneE164: string, token: string) {
  const { data, error } = await supabase.functions.invoke<VerifyOtpResponse>("verify-phone-otp", {
    body: { phone: phoneE164, code: token.trim() },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.ok || !data.token_hash) {
    throw new Error(data?.error || "Kod dogrulanamadi");
  }

  const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: data.token_hash,
    type: "email",
  });

  if (verifyError) {
    throw verifyError;
  }

  if (sessionData.user) {
    const displayPhone = formatPhoneForDisplay(phoneE164);
    await supabase
      .from("profiles")
      .update({ phone: displayPhone })
      .eq("id", sessionData.user.id);
  }

  return sessionData;
}

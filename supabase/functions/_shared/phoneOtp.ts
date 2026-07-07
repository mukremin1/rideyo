const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 3;
const SEND_WINDOW_MS = 15 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

export function phoneToSyntheticEmail(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  return `${digits}@phone.ride-yo.com`;
}

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function hashOtp(phoneE164: string, code: string): Promise<string> {
  const secret = Deno.env.get("PHONE_OTP_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "rideyo-otp";
  const payload = new TextEncoder().encode(`${phoneE164}:${code}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function otpExpiryIso(): string {
  return new Date(Date.now() + OTP_TTL_MS).toISOString();
}

export async function assertSendRateLimit(
  supabase: { from: (table: string) => unknown },
  phoneE164: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const since = new Date(Date.now() - SEND_WINDOW_MS).toISOString();
  const client = supabase as {
    from: (table: string) => {
      select: (cols: string, opts?: { count: string; head: boolean }) => {
        eq: (col: string, val: string) => {
          gte: (col: string, val: string) => Promise<{ count: number | null; error: Error | null }>;
        };
      };
    };
  };

  const { count, error } = await client
    .from("phone_otp_challenges")
    .select("id", { count: "exact", head: true })
    .eq("phone_e164", phoneE164)
    .gte("created_at", since);

  if (error) {
    console.error("[phone-otp] rate limit check failed:", error);
    return { ok: false, error: "OTP servisi gecici olarak kullanilamiyor" };
  }

  if ((count ?? 0) >= MAX_SENDS_PER_WINDOW) {
    return { ok: false, error: "Cok fazla kod istegi. Lutfen 15 dakika sonra tekrar deneyin." };
  }

  return { ok: true };
}

export const phoneOtpLimits = {
  MAX_VERIFY_ATTEMPTS,
};

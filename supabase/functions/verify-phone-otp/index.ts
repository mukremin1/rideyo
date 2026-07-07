import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  hashOtp,
  phoneOtpLimits,
  phoneToSyntheticEmail,
} from "../_shared/phoneOtp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const E164_TR = /^\+905\d{9}$/;

function displayPhone(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  return phoneE164;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, code } = await req.json();
    if (typeof phone !== "string" || !E164_TR.test(phone)) {
      return json({ ok: false, error: "Gecerli bir telefon numarasi girin" }, 400);
    }
    if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
      return json({ ok: false, error: "6 haneli kodu girin" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: challenge, error: challengeError } = await supabase
      .from("phone_otp_challenges")
      .select("id, otp_hash, expires_at, attempts, verified_at")
      .eq("phone_e164", phone)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (challengeError || !challenge) {
      return json({ ok: false, error: "Gecerli bir kod bulunamadi. Yeni kod isteyin." }, 400);
    }

    if (challenge.verified_at) {
      return json({ ok: false, error: "Bu kod zaten kullanildi" }, 400);
    }

    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      return json({ ok: false, error: "Kodun suresi doldu. Yeni kod isteyin." }, 400);
    }

    if (challenge.attempts >= phoneOtpLimits.MAX_VERIFY_ATTEMPTS) {
      return json({ ok: false, error: "Cok fazla hatali deneme. Yeni kod isteyin." }, 429);
    }

    const expectedHash = await hashOtp(phone, code.trim());
    if (expectedHash !== challenge.otp_hash) {
      await supabase
        .from("phone_otp_challenges")
        .update({ attempts: challenge.attempts + 1 })
        .eq("id", challenge.id);
      return json({ ok: false, error: "Dogrulama kodu hatali" }, 400);
    }

    await supabase
      .from("phone_otp_challenges")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", challenge.id);

    const syntheticEmail = phoneToSyntheticEmail(phone);
    let userId: string | null = null;

    const { data: existingUserId, error: lookupError } = await supabase.rpc(
      "get_auth_user_id_by_phone",
      { p_phone: phone },
    );

    if (lookupError) {
      console.error("[verify-phone-otp] lookup error:", lookupError);
    }
    if (typeof existingUserId === "string") {
      userId = existingUserId;
    }

    if (!userId) {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        phone,
        phone_confirm: true,
        user_metadata: {
          phone: displayPhone(phone),
          auth_method: "phone",
        },
      });

      if (createError || !created.user) {
        const isDuplicate =
          createError?.message?.toLowerCase().includes("already") ||
          createError?.message?.toLowerCase().includes("registered");
        if (isDuplicate) {
          const { data: retryId } = await supabase.rpc("get_auth_user_id_by_phone", { p_phone: phone });
          if (typeof retryId === "string") {
            userId = retryId;
          }
        }
        if (!userId) {
          console.error("[verify-phone-otp] create user error:", createError);
          return json({ ok: false, error: "Hesap olusturulamadi" }, 500);
        }
      } else {
        userId = created.user.id;
      }
    } else {
      await supabase.auth.admin.updateUserById(userId, {
        phone,
        phone_confirm: true,
        user_metadata: {
          phone: displayPhone(phone),
          auth_method: "phone",
        },
      });
    }

    await supabase
      .from("profiles")
      .update({ phone: displayPhone(phone) })
      .eq("id", userId);

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: syntheticEmail,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("[verify-phone-otp] generateLink error:", linkError);
      return json({ ok: false, error: "Oturum olusturulamadi" }, 500);
    }

    return json({
      ok: true,
      token_hash: linkData.properties.hashed_token,
    });
  } catch (error) {
    console.error("[verify-phone-otp] error:", error);
    return json(
      { ok: false, error: error instanceof Error ? error.message : "Bilinmeyen hata" },
      500,
    );
  }
});

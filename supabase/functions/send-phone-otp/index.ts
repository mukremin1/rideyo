import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { isSmsDemoMode, sendSms } from "../_shared/sms.ts";
import {
  assertSendRateLimit,
  generateOtpCode,
  hashOtp,
  otpExpiryIso,
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    if (typeof phone !== "string" || !E164_TR.test(phone)) {
      return json({ ok: false, error: "Gecerli bir Turkiye cep telefonu girin" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const rate = await assertSendRateLimit(supabase, phone);
    if (!rate.ok) {
      return json({ ok: false, error: rate.error }, 429);
    }

    const code = generateOtpCode();
    const otpHash = await hashOtp(phone, code);

    const { error: insertError } = await supabase.from("phone_otp_challenges").insert({
      phone_e164: phone,
      otp_hash: otpHash,
      expires_at: otpExpiryIso(),
    });

    if (insertError) {
      console.error("[send-phone-otp] insert error:", insertError);
      return json({ ok: false, error: "Kod olusturulamadi" }, 500);
    }

    const smsText = `RideYo dogrulama kodunuz: ${code}. 5 dakika gecerlidir.`;
    const sms = await sendSms(phone, smsText);
    if (!sms.ok) {
      return json({ ok: false, error: sms.error }, 502);
    }

    const response: Record<string, unknown> = { ok: true };
    if (isSmsDemoMode()) {
      response.demo = true;
      response.debug_code = code;
    }

    return json(response);
  } catch (error) {
    console.error("[send-phone-otp] error:", error);
    return json(
      { ok: false, error: error instanceof Error ? error.message : "Bilinmeyen hata" },
      500,
    );
  }
});

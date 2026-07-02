import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    if (!data.users.length) break;

    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectTo } = await req.json();
    const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalized || !normalized.includes("@")) {
      return json({ ok: false, code: "invalid_email", message: "Geçerli bir e-posta girin." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ ok: false, code: "config", message: "Sunucu yapılandırması eksik." }, 500);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const user = await findUserByEmail(admin, normalized);
    if (!user) {
      return json({
        ok: false,
        code: "not_found",
        message: "Bu e-posta ile kayıt bulunamadı. Önce Üye Ol ile kayıt olun.",
      });
    }

    if (user.email_confirmed_at) {
      return json({
        ok: false,
        code: "already_confirmed",
        message: "E-posta zaten doğrulanmış. Giriş yapabilirsiniz.",
      });
    }

    const emailRedirectTo =
      typeof redirectTo === "string" && redirectTo.startsWith("http")
        ? redirectTo
        : Deno.env.get("APP_URL") || "https://www.ride-yo.com/";

    const resendResponse = await fetch(`${supabaseUrl}/auth/v1/resend`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "signup",
        email: user.email,
        options: { email_redirect_to: emailRedirectTo },
      }),
    });

    const resendBody = await resendResponse.json().catch(() => ({}));

    if (resendResponse.ok) {
      return json({ ok: true, code: "sent", method: "signup" });
    }

    const otpResponse = await fetch(`${supabaseUrl}/auth/v1/otp`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        create_user: false,
        data: {},
        gotrue_meta_security: {},
        options: { email_redirect_to: emailRedirectTo },
      }),
    });

    const otpBody = await otpResponse.json().catch(() => ({}));

    if (otpResponse.ok) {
      return json({ ok: true, code: "sent", method: "magic_link" });
    }

    const message =
      (otpBody as { msg?: string }).msg ||
      (otpBody as { error_description?: string }).error_description ||
      (resendBody as { msg?: string }).msg ||
      (resendBody as { error_description?: string }).error_description ||
      "E-posta gönderilemedi. Supabase e-posta ayarlarını kontrol edin.";

    return json({ ok: false, code: "send_failed", message }, 502);
  } catch (error) {
    console.error("[resend-verification]", error);
    return json({ ok: false, code: "server_error", message: "Beklenmeyen sunucu hatası." }, 500);
  }
});

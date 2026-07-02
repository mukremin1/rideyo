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

const PRODUCTION_SITE_URL = "https://www.ride-yo.com";

function isLocalHost(url: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
}

function resolveEmailRedirectTo(redirectTo: unknown): string {
  const appUrlRaw = (Deno.env.get("APP_URL") || PRODUCTION_SITE_URL).trim().replace(/\/$/, "");
  const safeBase = isLocalHost(appUrlRaw) ? PRODUCTION_SITE_URL : appUrlRaw;

  if (typeof redirectTo === "string" && redirectTo.startsWith("http") && !isLocalHost(redirectTo)) {
    return redirectTo;
  }

  return `${safeBase}/auth/callback`;
}

function sanitizeActionLink(actionLink: string, redirectTo: string): string {
  try {
    const url = new URL(actionLink);
    const currentRedirect = url.searchParams.get("redirect_to");
    if (!currentRedirect || isLocalHost(decodeURIComponent(currentRedirect))) {
      url.searchParams.set("redirect_to", redirectTo);
    }
    return url.toString();
  } catch {
    return actionLink;
  }
}

async function sendWithResend(params: {
  apiKey: string;
  from: string;
  to: string;
  actionLink: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: "RideYo — E-posta adresinizi doğrulayın",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2 style="color:#FB6020;margin:0 0 16px">RideYo</h2>
          <p>Hesabınızı kullanmaya başlamak için e-posta adresinizi doğrulayın.</p>
          <p style="margin:24px 0">
            <a href="${params.actionLink}" style="background:#FB6020;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">
              E-postamı doğrula
            </a>
          </p>
          <p style="color:#666;font-size:13px">Buton çalışmazsa bu bağlantıyı tarayıcıya yapıştırın:<br>${params.actionLink}</p>
        </div>
      `,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (body as { message?: string }).message || `Resend HTTP ${response.status}`,
    );
  }
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

    const emailRedirectTo = resolveEmailRedirectTo(redirectTo);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFrom = Deno.env.get("RESEND_FROM") || "RideYo <onboarding@resend.dev>";

    if (resendApiKey) {
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "signup",
        email: user.email!,
        options: { redirectTo: emailRedirectTo },
      });

      if (linkError || !linkData?.properties?.action_link) {
        return json({
          ok: false,
          code: "link_failed",
          message: linkError?.message || "Doğrulama bağlantısı oluşturulamadı.",
        }, 502);
      }

      const actionLink = sanitizeActionLink(linkData.properties.action_link, emailRedirectTo);

      await sendWithResend({
        apiKey: resendApiKey,
        from: resendFrom,
        to: user.email!,
        actionLink,
      });

      return json({ ok: true, code: "sent", method: "resend_api" });
    }

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

    if (resendResponse.ok) {
      return json({
        ok: true,
        code: "sent",
        method: "supabase",
        warning: "RESEND_API_KEY tanımlı değil; Supabase varsayılan mail servisi kullanıldı.",
      });
    }

    const resendBody = await resendResponse.json().catch(() => ({}));
    const message =
      (resendBody as { msg?: string }).msg ||
      (resendBody as { error_description?: string }).error_description ||
      "E-posta gönderilemedi. Supabase SMTP veya RESEND_API_KEY ayarlayın.";

    return json({ ok: false, code: "send_failed", message }, 502);
  } catch (error) {
    console.error("[resend-verification]", error);
    return json({
      ok: false,
      code: "server_error",
      message: error instanceof Error ? error.message : "Beklenmeyen sunucu hatası.",
    }, 500);
  }
});

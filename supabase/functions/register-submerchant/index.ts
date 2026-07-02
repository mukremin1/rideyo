import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getIyzicoConfig, iyzicoPost, isIyzicoSuccess, isAutoOwnerPayoutEnabled } from "../_shared/iyzico.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SubMerchantRequest = {
  contactName: string;
  contactSurname: string;
  email: string;
  gsmNumber: string;
  identityNumber: string;
  iban: string;
  address: string;
  taxOffice?: string;
  legalCompanyTitle?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Yetkilendirme gerekli" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Geçersiz oturum" }, 401);

    const { data: hasOwnerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "car_owner")
      .maybeSingle();

    if (!hasOwnerRole) {
      return json({ error: "Araç sahibi rolü gerekli" }, 403);
    }

    const body: SubMerchantRequest = await req.json();
    const required = ["contactName", "contactSurname", "email", "gsmNumber", "identityNumber", "iban", "address"] as const;
    for (const field of required) {
      if (!body[field]?.trim()) return json({ error: `${field} zorunludur` }, 400);
    }

    const externalId = `owner-${user.id}`;
    const iyzico = getIyzicoConfig();
    const blockDemo = Deno.env.get("PAYMENT_DEMO_MODE") === "false";
    const manualPayout = !isAutoOwnerPayoutEnabled();

    let subMerchantKey: string | null = null;
    let status: "pending" | "active" | "rejected" = manualPayout ? "pending" : "pending";

    if (!manualPayout && iyzico) {
      const conversationId = `submerchant-${user.id}-${Date.now()}`;
      const res = await iyzicoPost("/onboarding/submerchant", {
        locale: "tr",
        conversationId,
        subMerchantExternalId: externalId,
        subMerchantType: "PERSONAL",
        address: body.address,
        contactName: body.contactName,
        contactSurname: body.contactSurname,
        email: body.email,
        gsmNumber: body.gsmNumber.startsWith("+") ? body.gsmNumber : `+90${body.gsmNumber.replace(/\D/g, "")}`,
        name: `${body.contactName} ${body.contactSurname}`,
        iban: body.iban.replace(/\s/g, ""),
        identityNumber: body.identityNumber,
        currency: "TRY",
        taxOffice: body.taxOffice ?? "Istanbul",
        legalCompanyTitle: body.legalCompanyTitle ?? `${body.contactName} ${body.contactSurname}`,
      }, iyzico);

      if (isIyzicoSuccess(res) && res.subMerchantKey) {
        subMerchantKey = res.subMerchantKey as string;
        status = "active";
      } else if (!blockDemo) {
        subMerchantKey = `demo-sm-${user.id.slice(0, 8)}`;
        status = "active";
      } else {
        return json({ error: res.errorMessage ?? "Alt üye işyeri kaydı başarısız" }, 400);
      }
    } else if (!manualPayout && !blockDemo) {
      subMerchantKey = `demo-sm-${user.id.slice(0, 8)}`;
      status = "active";
    } else if (!manualPayout && blockDemo) {
      return json({ error: "iyzico yapılandırması eksik" }, 503);
    }

    const { data: profile, error: upsertError } = await adminClient
      .from("owner_payout_profiles")
      .upsert({
        user_id: user.id,
        sub_merchant_key: subMerchantKey,
        sub_merchant_external_id: externalId,
        contact_name: body.contactName,
        contact_surname: body.contactSurname,
        email: body.email,
        gsm_number: body.gsmNumber,
        identity_number: body.identityNumber,
        iban: body.iban.replace(/\s/g, ""),
        address: body.address,
        tax_office: body.taxOffice ?? null,
        legal_company_title: body.legalCompanyTitle ?? null,
        status,
      }, { onConflict: "user_id" })
      .select("*")
      .single();

    if (upsertError) return json({ error: "Profil kaydedilemedi" }, 500);

    return json({
      success: true,
      profile,
      subMerchantKey,
      status,
      manualPayout,
    });
  } catch (error) {
    console.error("register-submerchant error:", error);
    return json({ error: "Kayıt işlemi başarısız" }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

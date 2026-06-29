import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  formatPrice,
  getAppReturnUrl,
  getIyzicoConfig,
  iyzicoPost,
  isIyzicoSuccess,
} from "../_shared/iyzico.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let paymentId: string | null = null;
    let conversationId: string | null = null;
    let mdStatus: string | null = null;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      paymentId = form.get("paymentId")?.toString() ?? null;
      conversationId = form.get("conversationId")?.toString() ?? form.get("conversationData")?.toString() ?? null;
      mdStatus = form.get("mdStatus")?.toString() ?? null;
    } else {
      const body = await req.json().catch(() => ({}));
      paymentId = body.paymentId ?? null;
      conversationId = body.conversationId ?? null;
      mdStatus = body.mdStatus ?? null;
    }

    if (!paymentId) {
      return redirectWithError("Ödeme kimliği bulunamadı");
    }

    const iyzico = getIyzicoConfig();
    if (!iyzico) {
      return redirectWithError("Ödeme sistemi yapılandırılmamış");
    }

    const authRes = await iyzicoPost("/payment/3dsecure/auth", {
      locale: "tr",
      paymentId,
      conversationId: conversationId ?? `callback-${paymentId}`,
    }, iyzico);

    if (!isIyzicoSuccess(authRes)) {
      console.error("3DS auth failed:", authRes);
      return redirectWithError(authRes.errorMessage ?? "3D Secure doğrulaması başarısız");
    }

    const convId = (authRes.conversationId as string) ?? conversationId ?? "";
    const bookingId = extractBookingId(convId);

    const { data: booking } = await adminClient
      .from("bookings")
      .select("id, user_id, provision_fee, payment_status")
      .eq("iyzico_conversation_id", convId)
      .maybeSingle();

    const resolvedBookingId = booking?.id ?? bookingId;

    if (!resolvedBookingId) {
      return redirectWithError("Rezervasyon eşleştirilemedi");
    }

    await adminClient
      .from("payment_transactions")
      .update({
        status: "success",
        iyzico_payment_id: authRes.paymentId as string,
      })
      .eq("iyzico_conversation_id", convId)
      .eq("type", "charge");

    await adminClient
      .from("bookings")
      .update({
        payment_status: "completed",
        iyzico_payment_id: authRes.paymentId as string,
      })
      .eq("id", resolvedBookingId);

    const provisionFee = booking?.provision_fee ?? 0;
    if (provisionFee > 0) {
      await holdProvision(adminClient, resolvedBookingId, provisionFee, authRes);
    }

    const cardUserKey = authRes.cardUserKey as string | undefined;
    const cardToken = authRes.cardToken as string | undefined;
    if (cardUserKey && cardToken && booking?.user_id) {
      await saveCardToken(adminClient, booking.user_id, authRes);
    }

    const returnUrl = getAppReturnUrl(resolvedBookingId) + "&status=success";
    return Response.redirect(returnUrl, 302);
  } catch (error) {
    console.error("payment-callback error:", error);
    return redirectWithError("Ödeme işlemi tamamlanamadı");
  }
});

function extractBookingId(conversationId: string): string | null {
  const match = conversationId.match(/^booking-([0-9a-f-]{36})-/i);
  return match?.[1] ?? null;
}

async function holdProvision(
  adminClient: ReturnType<typeof createClient>,
  bookingId: string,
  provisionFee: number,
  authRes: Record<string, unknown>,
) {
  const iyzico = getIyzicoConfig();
  if (!iyzico) return;

  const { data: booking } = await adminClient
    .from("bookings")
    .select("user_id, iyzico_payment_id")
    .eq("id", bookingId)
    .single();

  if (!booking) return;

  const conversationId = `provision-${bookingId}-${Date.now()}`;

  const preauthRes = await iyzicoPost("/payment/preauth", {
    locale: "tr",
    conversationId,
    price: formatPrice(provisionFee),
    paidPrice: formatPrice(provisionFee),
    currency: "TRY",
    installment: 1,
    paymentChannel: "WEB",
    paymentGroup: "PRODUCT",
    paymentId: booking.iyzico_payment_id ?? authRes.paymentId,
    basketItems: [{
      id: `provision-${bookingId}`,
      name: "Provizyon",
      category1: "Depozito",
      itemType: "VIRTUAL",
      price: formatPrice(provisionFee),
    }],
  }, iyzico);

  const success = isIyzicoSuccess(preauthRes);

  await adminClient.from("payment_transactions").insert({
    booking_id: bookingId,
    user_id: booking.user_id,
    type: "preauth",
    status: success ? "success" : "failed",
    amount: provisionFee,
    iyzico_payment_id: preauthRes.paymentId as string | undefined,
    iyzico_conversation_id: conversationId,
    error_message: success ? null : (preauthRes.errorMessage as string),
  });

  await adminClient
    .from("bookings")
    .update({
      provision_status: success ? "held" : "failed",
      iyzico_provision_payment_id: preauthRes.paymentId ?? null,
    })
    .eq("id", bookingId);
}

async function saveCardToken(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  authRes: Record<string, unknown>,
) {
  const cardUserKey = authRes.cardUserKey as string;
  const cardToken = authRes.cardToken as string;
  const lastFour = (authRes.lastFourDigits as string) ?? "0000";
  const association = ((authRes.cardAssociation as string) ?? "unknown").toLowerCase();

  await adminClient
    .from("profiles")
    .update({ iyzico_card_user_key: cardUserKey })
    .eq("id", userId);

  const { data: existing } = await adminClient
    .from("saved_cards")
    .select("id")
    .eq("user_id", userId)
    .eq("iyzico_card_token", cardToken)
    .maybeSingle();

  if (existing) return;

  await adminClient.from("saved_cards").insert({
    user_id: userId,
    card_holder_name: "Kayıtlı Kart",
    card_type: association,
    expiry_month: 12,
    expiry_year: 2030,
    last_four_digits: lastFour,
    encrypted_card_token: cardToken,
    iyzico_card_token: cardToken,
    iyzico_card_user_key: cardUserKey,
    is_default: false,
  });
}

function redirectWithError(message: string): Response {
  const base = Deno.env.get("APP_URL") ?? "https://rideyo.app";
  const url = `${base}/payment/callback?status=error&message=${encodeURIComponent(message)}`;
  return Response.redirect(url, 302);
}

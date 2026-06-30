import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { formatPrice, getIyzicoConfig, iyzicoPost, isIyzicoSuccess } from "../_shared/iyzico.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RefundRequest = {
  bookingId: string;
  reason?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Yetkilendirme gerekli" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Geçersiz oturum" }, 401);

    const body: RefundRequest = await req.json();
    if (!body.bookingId) return json({ error: "Rezervasyon ID gerekli" }, 400);

    const { data: adminRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!adminRole;

    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .select(`
        id, user_id, car_id, payment_status, total_price, rental_amount, provision_fee,
        provision_status, iyzico_payment_id, iyzico_provision_payment_id
      `)
      .eq("id", body.bookingId)
      .maybeSingle();

    if (bookingError || !booking) return json({ error: "Rezervasyon bulunamadı" }, 404);

    if (!isAdmin && booking.user_id !== user.id) {
      return json({ error: "Bu rezervasyonu iptal etme yetkiniz yok" }, 403);
    }

    const cancelReason = body.reason ?? (isAdmin ? "admin_cancelled" : "user_cancelled");

    if (booking.payment_status === "cancelled" || booking.payment_status === "refunded") {
      return json({ success: true, alreadyRefunded: true });
    }

    const iyzico = getIyzicoConfig();
    const blockDemo = Deno.env.get("PAYMENT_DEMO_MODE") === "false";

    if (booking.payment_status === "pending") {
      await adminClient
        .from("bookings")
        .update({ payment_status: "cancelled" })
        .eq("id", booking.id);
      return json({ success: true, mode: "cancelled_unpaid" });
    }

    const refundAmount = booking.rental_amount ?? booking.total_price - (booking.provision_fee ?? 0);

    if (!iyzico) {
      if (blockDemo) return json({ error: "İade sistemi yapılandırılmamış" }, 503);
      await adminClient.from("bookings").update({
        payment_status: "refunded",
        provision_status: booking.provision_status === "held" ? "released" : booking.provision_status,
      }).eq("id", booking.id);
      return json({ success: true, mode: "demo_refund", amount: refundAmount });
    }

    if (booking.iyzico_payment_id && ["completed", "authorized"].includes(booking.payment_status)) {
      const conversationId = `refund-${booking.id}-${Date.now()}`;
      const refundRes = await iyzicoPost("/payment/refund", {
        locale: "tr",
        conversationId,
        paymentTransactionId: booking.iyzico_payment_id,
        price: formatPrice(refundAmount),
        currency: "TRY",
        ip: "127.0.0.1",
      }, iyzico);

      await adminClient.from("payment_transactions").insert({
        booking_id: booking.id,
        user_id: booking.user_id,
        type: "refund",
        status: isIyzicoSuccess(refundRes) ? "success" : "failed",
        amount: refundAmount,
        iyzico_conversation_id: conversationId,
        error_message: isIyzicoSuccess(refundRes) ? null : refundRes.errorMessage,
        metadata: { reason: cancelReason },
      });

      if (!isIyzicoSuccess(refundRes)) {
        return json({ error: refundRes.errorMessage ?? "İade başarısız" }, 400);
      }
    }

    if (booking.provision_status === "held" && booking.iyzico_provision_payment_id) {
      await releaseProvision(adminClient, booking);
    }

    await adminClient
      .from("bookings")
      .update({ payment_status: "refunded", provision_status: "released" })
      .eq("id", booking.id);

    return json({ success: true, mode: "iyzico_refund", amount: refundAmount });
  } catch (error) {
    console.error("refund-payment error:", error);
    return json({ error: "İade işlemi başarısız" }, 500);
  }
});

async function releaseProvision(
  adminClient: ReturnType<typeof createClient>,
  booking: {
    id: string;
    user_id: string;
    provision_fee: number | null;
    iyzico_provision_payment_id: string | null;
  },
) {
  const iyzico = getIyzicoConfig();
  if (!iyzico || !booking.iyzico_provision_payment_id) return;

  const conversationId = `release-${booking.id}-${Date.now()}`;
  const cancelRes = await iyzicoPost("/payment/cancel", {
    locale: "tr",
    conversationId,
    paymentId: booking.iyzico_provision_payment_id,
    ip: "127.0.0.1",
  }, iyzico);

  await adminClient.from("payment_transactions").insert({
    booking_id: booking.id,
    user_id: booking.user_id,
    type: "cancel_preauth",
    status: isIyzicoSuccess(cancelRes) ? "success" : "failed",
    amount: booking.provision_fee ?? 0,
    iyzico_conversation_id: conversationId,
    error_message: isIyzicoSuccess(cancelRes) ? null : cancelRes.errorMessage,
  });
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

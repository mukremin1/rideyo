import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  formatPrice,
  getAppReturnUrl,
  getCallbackBaseUrl,
  getIyzicoConfig,
  iyzicoPost,
  isIyzicoSuccess,
  platformCommissionRate,
  isAutoOwnerPayoutEnabled,
} from "../_shared/iyzico.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CardInput = {
  cardHolder: string;
  cardNumber: string;
  expireMonth: string;
  expireYear: string;
  cvc: string;
};

type PaymentRequest = {
  bookingId: string;
  saveCard?: boolean;
  savedCardId?: string;
  cvc?: string;
  card?: CardInput;
};

type BookingRow = {
  id: string;
  user_id: string;
  car_id: string;
  payment_status: string;
  total_price: number;
  rental_amount: number | null;
  provision_fee: number | null;
  rental_type: string;
  cars: {
    id: string;
    name: string;
    owner_id: string;
  };
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

    const body: PaymentRequest = await req.json();
    if (!body.bookingId) return json({ error: "Rezervasyon ID gerekli" }, 400);

    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .select(`
        id, user_id, car_id, payment_status, total_price, rental_amount, provision_fee, rental_type,
        cars ( id, name, owner_id )
      `)
      .eq("id", body.bookingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (bookingError || !booking) return json({ error: "Rezervasyon bulunamadı" }, 404);

    const row = booking as unknown as BookingRow;
    const car = row.cars;
    if (!car) return json({ error: "Araç bilgisi bulunamadı" }, 404);

    if (row.payment_status === "completed" || row.payment_status === "in_progress") {
      return json({ success: true, alreadyPaid: true });
    }
    if (row.payment_status !== "pending") {
      return json({ error: "Rezervasyon ödemeye uygun değil" }, 400);
    }

    const provisionFee = row.provision_fee ?? 0;
    const rentalAmount = row.rental_amount ?? Math.max(0, row.total_price - provisionFee);
    const chargeAmount = rentalAmount > 0 ? rentalAmount : row.total_price - provisionFee;

    if (chargeAmount <= 0 && provisionFee <= 0) {
      return json({ error: "Geçersiz ödeme tutarı" }, 400);
    }

    const iyzico = getIyzicoConfig();
    const blockDemo = Deno.env.get("PAYMENT_DEMO_MODE") === "false";

    if (!iyzico) {
      if (blockDemo) {
        return json({ error: "Ödeme sistemi yapılandırılmamış. IYZICO_API_KEY gerekli." }, 503);
      }
      return handleDemoPayment(adminClient, row, chargeAmount, provisionFee);
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, phone, iyzico_card_user_key")
      .eq("id", user.id)
      .maybeSingle();

    const { data: authUser } = await adminClient.auth.admin.getUserById(user.id);
    const email = authUser.user?.email ?? `${user.id}@rideyo.app`;
    const fullName = profile?.full_name ?? "RideYo Kullanıcı";
    const nameParts = fullName.trim().split(/\s+/);
    const buyerName = nameParts[0] ?? "Ad";
    const buyerSurname = nameParts.slice(1).join(" ") || "Soyad";

    let paymentCard: Record<string, string> | null = null;
    let cardUserKey = profile?.iyzico_card_user_key ?? undefined;
    let saveCardAfter = body.saveCard === true;

    if (body.savedCardId) {
      const { data: savedCard } = await adminClient
        .from("saved_cards")
        .select("iyzico_card_token, iyzico_card_user_key, card_holder_name")
        .eq("id", body.savedCardId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!savedCard?.iyzico_card_token || !savedCard?.iyzico_card_user_key) {
        return json({ error: "Kayıtlı kart token bilgisi eksik" }, 400);
      }
      cardUserKey = savedCard.iyzico_card_user_key;
      paymentCard = {
        cardToken: savedCard.iyzico_card_token,
        cardUserKey: savedCard.iyzico_card_user_key,
      };
      if (body.cvc) paymentCard.cvc = body.cvc;
      saveCardAfter = false;
    } else if (body.card) {
      const cardNumber = body.card.cardNumber.replace(/\s/g, "");
      if (cardNumber.length < 15) return json({ error: "Geçersiz kart numarası" }, 400);
      paymentCard = {
        cardHolderName: body.card.cardHolder,
        cardNumber,
        expireMonth: body.card.expireMonth.padStart(2, "0"),
        expireYear: body.card.expireYear.length === 2 ? `20${body.card.expireYear}` : body.card.expireYear,
        cvc: body.card.cvc,
        registerCard: saveCardAfter ? "1" : "0",
      };
    } else {
      return json({ error: "Kart bilgisi gerekli" }, 400);
    }

    const conversationId = `booking-${row.id}-${Date.now()}`;
    const callbackUrl = getCallbackBaseUrl();

    const { data: ownerPayout } = await adminClient
      .from("owner_payout_profiles")
      .select("sub_merchant_key, status")
      .eq("user_id", car.owner_id)
      .eq("status", "active")
      .maybeSingle();

    const commissionRate = platformCommissionRate();
    const ownerShare = chargeAmount * (1 - commissionRate);
    const platformCommission = chargeAmount - ownerShare;

    const basketItems: Record<string, unknown>[] = [{
      id: row.id,
      name: car.name.slice(0, 100),
      category1: "Kiralama",
      itemType: "VIRTUAL",
      price: formatPrice(chargeAmount),
    }];

    // Manual hakediş by default — full payment to platform; admin transfers to owner IBAN later.
    if (isAutoOwnerPayoutEnabled() && ownerPayout?.sub_merchant_key) {
      basketItems[0].subMerchantKey = ownerPayout.sub_merchant_key;
      basketItems[0].subMerchantPrice = formatPrice(ownerShare);
    }

    const paymentBody: Record<string, unknown> = {
      locale: "tr",
      conversationId,
      price: formatPrice(chargeAmount),
      paidPrice: formatPrice(chargeAmount),
      currency: "TRY",
      installment: 1,
      paymentChannel: "WEB",
      paymentGroup: "PRODUCT",
      callbackUrl,
      enabledInstallments: [1],
      buyer: {
        id: user.id,
        name: buyerName,
        surname: buyerSurname,
        gsmNumber: profile?.phone ?? "+905555555555",
        email,
        identityNumber: "11111111111",
        registrationAddress: "Istanbul Turkiye",
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1",
        city: "Istanbul",
        country: "Turkey",
      },
      shippingAddress: {
        contactName: fullName,
        city: "Istanbul",
        country: "Turkey",
        address: "Istanbul",
      },
      billingAddress: {
        contactName: fullName,
        city: "Istanbul",
        country: "Turkey",
        address: "Istanbul",
      },
      basketItems,
      paymentCard,
    };

    if (cardUserKey && saveCardAfter) {
      paymentBody.cardUserKey = cardUserKey;
    }

    await adminClient.from("payment_transactions").insert({
      booking_id: row.id,
      user_id: user.id,
      owner_id: car.owner_id,
      type: "charge",
      status: "pending",
      amount: chargeAmount,
      platform_commission: platformCommission,
      owner_payout_amount: ownerShare,
      owner_payout_status: ownerShare > 0 ? "pending" : "not_applicable",
      iyzico_conversation_id: conversationId,
      metadata: { provisionFee, saveCard: saveCardAfter },
    });

    await adminClient
      .from("bookings")
      .update({
        iyzico_conversation_id: conversationId,
        rental_amount: rentalAmount || chargeAmount,
        provision_fee: provisionFee,
      })
      .eq("id", row.id);

    const paymentRes = await iyzicoPost("/payment/3dsecure/initialize", paymentBody, iyzico);

    if (!isIyzicoSuccess(paymentRes) || !paymentRes.threeDSHtmlContent) {
      await adminClient
        .from("payment_transactions")
        .update({
          status: "failed",
          error_message: paymentRes.errorMessage ?? "3DS başlatılamadı",
        })
        .eq("iyzico_conversation_id", conversationId)
        .eq("type", "charge");

      return json({
        error: paymentRes.errorMessage ?? "Ödeme başlatılamadı",
        errorCode: paymentRes.errorCode,
      }, 400);
    }

    return json({
      success: true,
      mode: "iyzico_3ds",
      requires3DS: true,
      threeDSHtmlContent: paymentRes.threeDSHtmlContent,
      conversationId,
      paymentId: paymentRes.paymentId,
      returnUrl: getAppReturnUrl(row.id),
    });
  } catch (error) {
    console.error("process-payment error:", error);
    return json({ error: "Ödeme işlemi başarısız" }, 500);
  }
});

async function handleDemoPayment(
  adminClient: ReturnType<typeof createClient>,
  row: BookingRow,
  chargeAmount: number,
  provisionFee: number,
) {
  const { data: updated, error } = await adminClient
    .from("bookings")
    .update({
      payment_status: "completed",
      provision_status: provisionFee > 0 ? "held" : "released",
      rental_amount: chargeAmount,
      provision_fee: provisionFee,
    })
    .eq("id", row.id)
    .eq("payment_status", "pending")
    .select("id")
    .maybeSingle();

  if (error || !updated) return json({ error: "Ödeme durumu güncellenemedi" }, 500);

  const commissionRate = platformCommissionRate();
  const ownerShare = chargeAmount * (1 - commissionRate);
  const platformCommission = chargeAmount - ownerShare;

  await adminClient.from("payment_transactions").insert({
    booking_id: row.id,
    user_id: row.user_id,
    owner_id: row.cars.owner_id,
    type: "charge",
    status: "success",
    amount: chargeAmount,
    platform_commission: platformCommission,
    owner_payout_amount: ownerShare,
    owner_payout_status: ownerShare > 0 ? "pending" : "not_applicable",
    metadata: { mode: "demo", provisionFee },
  });

  if (provisionFee > 0) {
    await adminClient.from("payment_transactions").insert({
      booking_id: row.id,
      user_id: row.user_id,
      type: "preauth",
      status: "success",
      amount: provisionFee,
      metadata: { mode: "demo" },
    });
  }

  return json({
    success: true,
    mode: "demo",
    requires3DS: false,
    amount: chargeAmount + provisionFee,
  });
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

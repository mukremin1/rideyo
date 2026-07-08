import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  formatPrice,
  getIyzicoConfig,
  iyzicoPost,
  isAutoOwnerPayoutEnabled,
  isIyzicoSuccess,
  platformCommissionRate,
} from "./iyzico.ts";

export type SavedCardRow = {
  id: string;
  iyzico_card_token: string;
  iyzico_card_user_key: string;
  card_holder_name: string;
};

type CarRow = {
  id: string;
  name: string;
  owner_id: string;
};

export type CardChargeResult = {
  paymentStatus: "charged" | "failed";
  paymentId?: string;
  error?: string;
};

export async function loadSavedCard(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  preferredCardId: string | null,
): Promise<SavedCardRow | null> {
  if (preferredCardId) {
    const { data } = await supabase
      .from("saved_cards")
      .select("id, iyzico_card_token, iyzico_card_user_key, card_holder_name")
      .eq("id", preferredCardId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.iyzico_card_token && data?.iyzico_card_user_key) return data as SavedCardRow;
  }

  const { data: defaultCard } = await supabase
    .from("saved_cards")
    .select("id, iyzico_card_token, iyzico_card_user_key, card_holder_name")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();
  if (defaultCard?.iyzico_card_token && defaultCard?.iyzico_card_user_key) {
    return defaultCard as SavedCardRow;
  }

  const { data: latestCard } = await supabase
    .from("saved_cards")
    .select("id, iyzico_card_token, iyzico_card_user_key, card_holder_name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestCard?.iyzico_card_token && latestCard?.iyzico_card_user_key) {
    return latestCard as SavedCardRow;
  }

  return null;
}

export async function chargeWithSavedCard(
  supabase: ReturnType<typeof createClient>,
  params: {
    bookingId: string;
    userId: string;
    car: CarRow;
    savedCard: SavedCardRow;
    amount: number;
    conversationPrefix: string;
    transactionType: "overtime_charge" | "km_charge" | "extension_charge";
    basketLabel: string;
    metadata: Record<string, unknown>;
  },
): Promise<CardChargeResult> {
  const { bookingId, userId, car, savedCard, amount, conversationPrefix, transactionType, basketLabel, metadata } =
    params;

  const iyzico = getIyzicoConfig();
  const allowDemo = Deno.env.get("PAYMENT_DEMO_MODE") !== "false";
  const conversationId = `${conversationPrefix}-${bookingId}-${Date.now()}`;

  if (!iyzico) {
    if (!allowDemo) {
      return { paymentStatus: "failed", error: "Odeme sistemi yapilandirilmamis" };
    }

    await supabase.from("payment_transactions").insert({
      booking_id: bookingId,
      user_id: userId,
      owner_id: car.owner_id,
      type: transactionType,
      status: "success",
      amount,
      iyzico_conversation_id: conversationId,
      metadata: { ...metadata, mode: "demo" },
    });

    return { paymentStatus: "charged", paymentId: `demo-${conversationId}` };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", userId)
    .maybeSingle();

  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const email = authUser.user?.email ?? `${userId}@rideyo.app`;
  const fullName = profile?.full_name ?? savedCard.card_holder_name ?? "RideYo Kullanici";
  const nameParts = fullName.trim().split(/\s+/);
  const buyerName = nameParts[0] ?? "Ad";
  const buyerSurname = nameParts.slice(1).join(" ") || "Soyad";

  const commissionRate = platformCommissionRate();
  const ownerShare = amount * (1 - commissionRate);
  const platformCommission = amount - ownerShare;

  const { data: ownerPayout } = await supabase
    .from("owner_payout_profiles")
    .select("sub_merchant_key, status")
    .eq("user_id", car.owner_id)
    .eq("status", "active")
    .maybeSingle();

  const basketItem: Record<string, unknown> = {
    id: `${bookingId}-${transactionType}`,
    name: basketLabel.slice(0, 100),
    category1: "Kiralama",
    itemType: "VIRTUAL",
    price: formatPrice(amount),
  };

  if (isAutoOwnerPayoutEnabled() && ownerPayout?.sub_merchant_key) {
    basketItem.subMerchantKey = ownerPayout.sub_merchant_key;
    basketItem.subMerchantPrice = formatPrice(ownerShare);
  }

  await supabase.from("payment_transactions").insert({
    booking_id: bookingId,
    user_id: userId,
    owner_id: car.owner_id,
    type: transactionType,
    status: "pending",
    amount,
    platform_commission: platformCommission,
    owner_payout_amount: ownerShare,
    owner_payout_status: ownerShare > 0 ? "pending" : "not_applicable",
    iyzico_conversation_id: conversationId,
    metadata,
  });

  const paymentRes = await iyzicoPost("/payment/auth", {
    locale: "tr",
    conversationId,
    price: formatPrice(amount),
    paidPrice: formatPrice(amount),
    currency: "TRY",
    installment: 1,
    paymentChannel: "WEB",
    paymentGroup: "PRODUCT",
    buyer: {
      id: userId,
      name: buyerName,
      surname: buyerSurname,
      gsmNumber: profile?.phone ?? "+905555555555",
      email,
      identityNumber: "11111111111",
      registrationAddress: "Istanbul Turkiye",
      ip: "127.0.0.1",
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
    basketItems: [basketItem],
    paymentCard: {
      cardToken: savedCard.iyzico_card_token,
      cardUserKey: savedCard.iyzico_card_user_key,
    },
  }, iyzico);

  if (!isIyzicoSuccess(paymentRes)) {
    await supabase
      .from("payment_transactions")
      .update({
        status: "failed",
        error_message: paymentRes.errorMessage ?? "Odeme basarisiz",
      })
      .eq("iyzico_conversation_id", conversationId)
      .eq("type", transactionType);

    return {
      paymentStatus: "failed",
      error: paymentRes.errorMessage ?? "Odeme basarisiz",
    };
  }

  await supabase
    .from("payment_transactions")
    .update({
      status: "success",
      iyzico_payment_id: paymentRes.paymentId as string,
    })
    .eq("iyzico_conversation_id", conversationId)
    .eq("type", transactionType);

  return {
    paymentStatus: "charged",
    paymentId: paymentRes.paymentId as string,
  };
}

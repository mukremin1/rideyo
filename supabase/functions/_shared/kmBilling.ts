import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chargeWithSavedCard, loadSavedCard } from "./savedCardPayment.ts";

export const DEFAULT_KM_RATE = 26.5;

export function getKmRatePerUnit(): number {
  const raw = Deno.env.get("KM_PRICE_PER_UNIT");
  const rate = raw ? parseFloat(raw) : DEFAULT_KM_RATE;
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_KM_RATE;
}

export function computeChargeableKm(totalDistanceKm: number, includedKm: number): number {
  const chargeable = Math.max(0, totalDistanceKm - includedKm);
  return Math.round(chargeable * 100) / 100;
}

export function computeKmChargeAmount(chargeableKm: number, ratePerKm: number): number {
  return Math.round(chargeableKm * ratePerKm * 100) / 100;
}

type KmBooking = {
  id: string;
  user_id: string;
  total_price: number;
  payment_saved_card_id: string | null;
  km_package_included_km: number | null;
};

type CarRow = {
  id: string;
  name: string;
  owner_id: string;
};

export type KmChargeResult =
  | { charged: false; chargeableKm: 0; kmAmount: 0; totalDistanceKm: number }
  | {
      charged: true;
      totalDistanceKm: number;
      includedKm: number;
      chargeableKm: number;
      kmAmount: number;
      ratePerKm: number;
      paymentStatus: "charged" | "failed";
      error?: string;
    };

export async function chargeKmIfNeeded(
  supabase: ReturnType<typeof createClient>,
  booking: KmBooking,
  car: CarRow,
  totalDistanceKm: number,
): Promise<KmChargeResult> {
  const distance = Math.max(0, Math.round(totalDistanceKm * 100) / 100);
  const includedKm = booking.km_package_included_km ?? 0;
  const chargeableKm = computeChargeableKm(distance, includedKm);

  if (chargeableKm <= 0) {
    await supabase
      .from("bookings")
      .update({
        total_distance_km: distance,
        chargeable_km: 0,
        km_charge_amount: 0,
        km_charge_status: "none",
      })
      .eq("id", booking.id);

    return { charged: false, chargeableKm: 0, kmAmount: 0, totalDistanceKm: distance };
  }

  const ratePerKm = getKmRatePerUnit();
  const kmAmount = computeKmChargeAmount(chargeableKm, ratePerKm);

  await supabase
    .from("bookings")
    .update({
      total_distance_km: distance,
      chargeable_km: chargeableKm,
      km_rate: ratePerKm,
      km_charge_amount: kmAmount,
      km_charge_status: "pending",
    })
    .eq("id", booking.id);

  const savedCard = await loadSavedCard(supabase, booking.user_id, booking.payment_saved_card_id);
  if (!savedCard) {
    await supabase.from("bookings").update({ km_charge_status: "failed" }).eq("id", booking.id);
    return {
      charged: true,
      totalDistanceKm: distance,
      includedKm,
      chargeableKm,
      kmAmount,
      ratePerKm,
      paymentStatus: "failed",
      error: "Kayitli kart bulunamadi",
    };
  }

  const payment = await chargeWithSavedCard(supabase, {
    bookingId: booking.id,
    userId: booking.user_id,
    car,
    savedCard,
    amount: kmAmount,
    conversationPrefix: "km",
    transactionType: "km_charge",
    basketLabel: `${car.name} km ucreti`,
    metadata: { totalDistanceKm: distance, includedKm, chargeableKm, ratePerKm },
  });

  if (payment.paymentStatus === "failed") {
    await supabase.from("bookings").update({ km_charge_status: "failed" }).eq("id", booking.id);
    return {
      charged: true,
      totalDistanceKm: distance,
      includedKm,
      chargeableKm,
      kmAmount,
      ratePerKm,
      paymentStatus: "failed",
      error: payment.error,
    };
  }

  await supabase
    .from("bookings")
    .update({
      km_charge_status: "charged",
      km_iyzico_payment_id: payment.paymentId ?? null,
      total_price: booking.total_price + kmAmount,
    })
    .eq("id", booking.id);

  return {
    charged: true,
    totalDistanceKm: distance,
    includedKm,
    chargeableKm,
    kmAmount,
    ratePerKm,
    paymentStatus: "charged",
  };
}

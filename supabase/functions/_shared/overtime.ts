import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chargeWithSavedCard, loadSavedCard } from "./savedCardPayment.ts";

export const DEFAULT_OVERTIME_RATE_PER_MINUTE = 7.5;

export function getOvertimeRatePerMinute(): number {
  const raw = Deno.env.get("OVERTIME_RATE_PER_MINUTE");
  const rate = raw ? parseFloat(raw) : DEFAULT_OVERTIME_RATE_PER_MINUTE;
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_OVERTIME_RATE_PER_MINUTE;
}

export function computeOvertimeMinutes(prepaidEndTime: Date, actualEndTime: Date): number {
  const diffMs = actualEndTime.getTime() - prepaidEndTime.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / 60_000);
}

export function computeOvertimeAmount(overtimeMinutes: number, ratePerMinute: number): number {
  return Math.round(overtimeMinutes * ratePerMinute * 100) / 100;
}

type OvertimeBooking = {
  id: string;
  user_id: string;
  car_id: string;
  end_time: string;
  rental_type: string;
  total_price: number;
  payment_saved_card_id: string | null;
};

type CarRow = {
  id: string;
  name: string;
  owner_id: string;
};

export type OvertimeChargeResult =
  | { charged: false; overtimeMinutes: 0; overtimeAmount: 0 }
  | {
      charged: true;
      overtimeMinutes: number;
      overtimeAmount: number;
      ratePerMinute: number;
      paymentStatus: "charged" | "failed";
      error?: string;
    };

export async function chargeOvertimeIfNeeded(
  supabase: ReturnType<typeof createClient>,
  booking: OvertimeBooking,
  car: CarRow,
  actualEndTime: Date,
): Promise<OvertimeChargeResult> {
  const flexibleRental = booking.rental_type === "minute" || booking.rental_type === "hour";
  if (!flexibleRental) {
    return { charged: false, overtimeMinutes: 0, overtimeAmount: 0 };
  }

  const prepaidEnd = new Date(booking.end_time);
  const overtimeMinutes = computeOvertimeMinutes(prepaidEnd, actualEndTime);
  if (overtimeMinutes <= 0) {
    return { charged: false, overtimeMinutes: 0, overtimeAmount: 0 };
  }

  const ratePerMinute = getOvertimeRatePerMinute();
  const overtimeAmount = computeOvertimeAmount(overtimeMinutes, ratePerMinute);

  await supabase
    .from("bookings")
    .update({
      actual_end_time: actualEndTime.toISOString(),
      overtime_minutes: overtimeMinutes,
      overtime_rate: ratePerMinute,
      overtime_amount: overtimeAmount,
      overtime_payment_status: "pending",
    })
    .eq("id", booking.id);

  const savedCard = await loadSavedCard(supabase, booking.user_id, booking.payment_saved_card_id);
  if (!savedCard) {
    await supabase.from("bookings").update({ overtime_payment_status: "failed" }).eq("id", booking.id);
    return {
      charged: true,
      overtimeMinutes,
      overtimeAmount,
      ratePerMinute,
      paymentStatus: "failed",
      error: "Kayitli kart bulunamadi",
    };
  }

  const payment = await chargeWithSavedCard(supabase, {
    bookingId: booking.id,
    userId: booking.user_id,
    car,
    savedCard,
    amount: overtimeAmount,
    conversationPrefix: "overtime",
    transactionType: "overtime_charge",
    basketLabel: `${car.name} ek sure`,
    metadata: { overtimeMinutes, ratePerMinute },
  });

  if (payment.paymentStatus === "failed") {
    await supabase.from("bookings").update({ overtime_payment_status: "failed" }).eq("id", booking.id);
    return {
      charged: true,
      overtimeMinutes,
      overtimeAmount,
      ratePerMinute,
      paymentStatus: "failed",
      error: payment.error,
    };
  }

  await supabase
    .from("bookings")
    .update({
      overtime_payment_status: "charged",
      overtime_iyzico_payment_id: payment.paymentId ?? null,
      total_price: booking.total_price + overtimeAmount,
    })
    .eq("id", booking.id);

  return {
    charged: true,
    overtimeMinutes,
    overtimeAmount,
    ratePerMinute,
    paymentStatus: "charged",
  };
}

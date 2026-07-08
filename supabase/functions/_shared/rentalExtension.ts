import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chargeWithSavedCard, loadSavedCard } from "./savedCardPayment.ts";
import { computeHourlyRentalBase } from "./hourlyPricing.ts";

export const EXTENSION_MINUTE_OPTIONS = [15, 30, 45] as const;
export const EXTENSION_HOUR_OPTIONS = [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const EXTENSION_DAY_OPTIONS = [1, 2, 3, 5, 7, 14, 30] as const;

export type ExtensionUnits = {
  extensionMinutes?: number;
  extensionHours?: number;
  extensionDays?: number;
};

type CarPricing = {
  price_per_minute: number;
  price_per_hour: number;
  price_per_day: number;
};

export function computeExtensionMilliseconds(
  rentalType: string,
  units: ExtensionUnits,
): number | null {
  if (rentalType === "minute") {
    const minutes = units.extensionMinutes;
    if (!minutes || !EXTENSION_MINUTE_OPTIONS.includes(minutes as (typeof EXTENSION_MINUTE_OPTIONS)[number])) {
      return null;
    }
    return minutes * 60_000;
  }
  if (rentalType === "hour") {
    const hours = units.extensionHours;
    if (hours == null || !EXTENSION_HOUR_OPTIONS.includes(hours as (typeof EXTENSION_HOUR_OPTIONS)[number])) {
      return null;
    }
    return hours * 60 * 60_000;
  }
  if (rentalType === "day") {
    const days = units.extensionDays;
    if (!days || !EXTENSION_DAY_OPTIONS.includes(days as (typeof EXTENSION_DAY_OPTIONS)[number])) {
      return null;
    }
    return days * 24 * 60 * 60_000;
  }
  return null;
}

export function computeExtensionAmount(rentalType: string, car: CarPricing, units: ExtensionUnits): number | null {
  if (rentalType === "minute") {
    const minutes = units.extensionMinutes;
    if (!minutes) return null;
    return Math.round(minutes * Number(car.price_per_minute) * 100) / 100;
  }
  if (rentalType === "hour") {
    const hours = units.extensionHours;
    if (hours == null) return null;
    return computeHourlyRentalBase(Number(car.price_per_hour), hours);
  }
  if (rentalType === "day") {
    const days = units.extensionDays;
    if (!days) return null;
    return Math.round(days * Number(car.price_per_day) * 100) / 100;
  }
  return null;
}

export type ExtendRentalResult =
  | { success: false; error: string }
  | {
      success: true;
      extensionAmount: number;
      newEndTime: string;
      paymentStatus: "charged" | "failed";
      error?: string;
    };

export async function extendActiveRental(
  supabase: ReturnType<typeof createClient>,
  params: {
    bookingId: string;
    userId: string;
    car: { id: string; name: string; owner_id: string; price_per_minute: number; price_per_hour: number; price_per_day: number };
    units: ExtensionUnits;
  },
): Promise<ExtendRentalResult> {
  const { bookingId, userId, car, units } = params;

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, user_id, car_id, rental_type, end_time, total_price, rental_amount, payment_status, payment_saved_card_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) return { success: false, error: "Rezervasyon bulunamadi" };
  if (booking.user_id !== userId) return { success: false, error: "Bu rezervasyon size ait degil" };
  if (booking.car_id !== car.id) return { success: false, error: "Arac rezervasyonla eslesmiyor" };
  if (booking.payment_status !== "in_progress") {
    return { success: false, error: "Uzatma yalnizca aktif kiralama sirasinda yapilabilir" };
  }

  const extensionMs = computeExtensionMilliseconds(booking.rental_type, units);
  const extensionAmount = computeExtensionAmount(booking.rental_type, car, units);

  if (!extensionMs || extensionAmount == null || extensionAmount <= 0) {
    return { success: false, error: "Gecersiz uzatma suresi" };
  }

  const now = new Date();
  const currentEnd = new Date(booking.end_time);
  const baseTime = currentEnd.getTime() > now.getTime() ? currentEnd : now;
  const newEndTime = new Date(baseTime.getTime() + extensionMs);

  const savedCard = await loadSavedCard(supabase, userId, booking.payment_saved_card_id);
  if (!savedCard) {
    return { success: false, error: "Kayitli kart bulunamadi" };
  }

  const payment = await chargeWithSavedCard(supabase, {
    bookingId,
    userId,
    car: { id: car.id, name: car.name, owner_id: car.owner_id },
    savedCard,
    amount: extensionAmount,
    conversationPrefix: "extend",
    transactionType: "extension_charge",
    basketLabel: `${car.name} kiralama uzatma`,
    metadata: { ...units, rentalType: booking.rental_type, newEndTime: newEndTime.toISOString() },
  });

  if (payment.paymentStatus === "failed") {
    return {
      success: true,
      extensionAmount,
      newEndTime: newEndTime.toISOString(),
      paymentStatus: "failed",
      error: payment.error ?? "Uzatma ucreti tahsil edilemedi",
    };
  }

  const totalPrice = Number(booking.total_price) + extensionAmount;
  const rentalAmount = Number(booking.rental_amount ?? 0) + extensionAmount;

  await supabase
    .from("bookings")
    .update({
      end_time: newEndTime.toISOString(),
      total_price: totalPrice,
      rental_amount: rentalAmount,
      overtime_minutes: 0,
      overtime_amount: 0,
      overtime_payment_status: "none",
    })
    .eq("id", bookingId);

  return {
    success: true,
    extensionAmount,
    newEndTime: newEndTime.toISOString(),
    paymentStatus: "charged",
  };
}

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];

const isMissingColumnError = (message: string) =>
  /column|schema cache|additional_driver|car_blocked|could not find/i.test(message);

export async function createBookingRecord(
  payload: BookingInsert,
): Promise<{ data: { id: string } | null; error?: string }> {
  const { data, error } = await supabase
    .from("bookings")
    .insert(payload)
    .select("id")
    .single();

  if (!error && data) {
    return { data };
  }

  if (!error || !isMissingColumnError(error.message)) {
    return { data: null, error: error?.message ?? "Rezervasyon oluşturulamadı." };
  }

  const {
    additional_driver_enabled: _enabled,
    additional_driver_name: _name,
    additional_driver_license: _license,
    additional_driver_fee: _fee,
    ...corePayload
  } = payload;

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("bookings")
    .insert(corePayload)
    .select("id")
    .single();

  if (fallbackError || !fallbackData) {
    return { data: null, error: fallbackError?.message ?? error.message };
  }

  return { data: fallbackData };
}

import { supabase } from "@/integrations/supabase/client";

export type RentalLocationPayload = {
  bookingId: string;
  carId: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

export async function reportRentalLocation(payload: RentalLocationPayload): Promise<boolean> {
  const { error } = await supabase.functions.invoke("update-rental-location", {
    body: payload,
  });

  if (error) {
    console.warn("reportRentalLocation failed:", error);
    return false;
  }

  return true;
}

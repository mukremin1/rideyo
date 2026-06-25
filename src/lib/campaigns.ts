import { supabase } from "@/integrations/supabase/client";

export type ActiveCampaign = {
  name: string;
  discount_percentage: number;
};

export async function fetchActiveCampaignForCarType(
  carType: string,
): Promise<ActiveCampaign | null> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("campaigns")
    .select("discount_percentage, name")
    .eq("is_active", true)
    .lte("start_date", now)
    .gte("end_date", now)
    .or(`car_types.is.null,car_types.cs.{${carType}}`)
    .order("discount_percentage", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

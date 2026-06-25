import { supabase } from "@/integrations/supabase/client";
import { isIdentityFullyVerified } from "@/lib/identityVerification";

export type RentalEligibility = {
  eligible: boolean;
  reason?: string;
  redirectTo?: string;
};

export async function checkRentalEligibility(
  userId: string,
  metadata: Record<string, unknown> | undefined,
): Promise<RentalEligibility> {
  if (!isIdentityFullyVerified(metadata)) {
    return {
      eligible: false,
      reason: "Kiralama öncesi kimlik (NFC) ve canlılık doğrulamasını tamamlayın.",
      redirectTo: "/identity-verification",
    };
  }

  const { data: driverHistory } = await supabase
    .from("driver_history")
    .select("is_approved, license_number")
    .eq("user_id", userId)
    .maybeSingle();

  if (!driverHistory?.is_approved || !driverHistory.license_number) {
    return {
      eligible: false,
      reason: "Kiralama öncesi ehliyet doğrulamasını tamamlayın.",
      redirectTo: "/identity-verification",
    };
  }

  return { eligible: true };
}

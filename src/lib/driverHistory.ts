import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_DRIVER_SCORE } from "@/lib/driverScore";

export type DriverIdentityFields = {
  nationalId?: string;
  surname?: string;
  givenNames?: string;
};

/** Ehliyet kaydını user_id üzerinden upsert eder; kimlik alanları isteğe bağlıdır. */
export async function persistDriverLicenseRecord(
  userId: string,
  licenseNumber: string,
  identity?: DriverIdentityFields,
): Promise<{ ok: boolean; error?: string }> {
  const cleanLicense = licenseNumber.trim().toUpperCase();
  if (!userId || !cleanLicense) {
    return { ok: false, error: "Kullanıcı veya ehliyet numarası eksik." };
  }

  const core = {
    user_id: userId,
    license_number: cleanLicense,
    penalty_points: 0,
    total_accidents: 0,
    traffic_violations: 0,
    driver_score: DEFAULT_DRIVER_SCORE,
    is_approved: true,
    verification_status: "verified",
    blocked_reason: null,
  };

  const { error: upsertError } = await supabase
    .from("driver_history")
    .upsert(core, { onConflict: "user_id" });

  if (upsertError) {
    const { error: updateError } = await supabase
      .from("driver_history")
      .update({
        license_number: core.license_number,
        penalty_points: 0,
        total_accidents: 0,
        traffic_violations: 0,
        driver_score: DEFAULT_DRIVER_SCORE,
        is_approved: true,
        verification_status: "verified",
      })
      .eq("user_id", userId);

    if (updateError) {
      const { error: insertError } = await supabase.from("driver_history").insert(core);
      if (insertError) {
        return { ok: false, error: insertError.message };
      }
    }
  }

  if (identity?.nationalId) {
    const { data: conflict } = await supabase
      .from("driver_history")
      .select("user_id")
      .eq("national_id", identity.nationalId)
      .neq("user_id", userId)
      .maybeSingle();

    if (!conflict) {
      await supabase
        .from("driver_history")
        .update({
          national_id: identity.nationalId,
          verified_surname: identity.surname ?? null,
          verified_given_names: identity.givenNames ?? null,
        })
        .eq("user_id", userId);
    }
  }

  return { ok: true };
}

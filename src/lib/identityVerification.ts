import { supabase } from "@/integrations/supabase/client";
import type { EidCardData } from "@/lib/eidReader";

/** YYMMDD → YYYY-MM-DD for hidden date inputs */
export const yymmddToIso = (yymmdd: string): string => {
  if (!yymmdd || yymmdd.length !== 6) return "";
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const century = yy >= 50 ? 1900 : 2000;
  return `${century + yy}-${yymmdd.slice(2, 4)}-${yymmdd.slice(4, 6)}`;
};

/** YYYY-MM-DD → YYMMDD for BAC */
export const isoToYymmdd = (iso: string): string => {
  if (!iso || iso.length < 10) return iso;
  return iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10);
};

export type StoredIdentityMeta = {
  nfcVerified: boolean;
  livenessVerified: boolean;
  docNumber?: string;
  dobYymmdd?: string;
  expYymmdd?: string;
  nationalId?: string;
  surname?: string;
  givenNames?: string;
};

export const isNfcVerified = (metadata: Record<string, unknown> | undefined): boolean => {
  const stored = readStoredIdentity(metadata);
  return stored.nfcVerified || Boolean(stored.nationalId);
};

export const isIdentityFullyVerified = (metadata: Record<string, unknown> | undefined): boolean => {
  const stored = readStoredIdentity(metadata);
  return stored.nfcVerified && stored.livenessVerified;
};

export const markIdentityVerifiedLocal = (userId: string): void => {
  localStorage.setItem(`nfc_verified_${userId}`, "true");
};

export const isIdentityVerifiedLocally = (userId: string): boolean =>
  localStorage.getItem(`nfc_verified_${userId}`) === "true";

export const readStoredIdentity = (metadata: Record<string, unknown> | undefined): StoredIdentityMeta => ({
  nfcVerified: Boolean(metadata?.nfc_verified_at || metadata?.nfc_verified),
  livenessVerified: Boolean(metadata?.liveness_verified_at || metadata?.liveness_verified),
  docNumber: typeof metadata?.id_doc_number === "string" ? metadata.id_doc_number : undefined,
  dobYymmdd: typeof metadata?.id_dob_yymmdd === "string" ? metadata.id_dob_yymmdd : undefined,
  expYymmdd: typeof metadata?.id_exp_yymmdd === "string" ? metadata.id_exp_yymmdd : undefined,
  nationalId: typeof metadata?.national_id === "string" ? metadata.national_id : undefined,
  surname: typeof metadata?.verified_surname === "string" ? metadata.verified_surname : undefined,
  givenNames: typeof metadata?.verified_given_names === "string" ? metadata.verified_given_names : undefined,
});

export const saveNfcVerification = async (
  userId: string,
  card: EidCardData,
  bac: { docNumber: string; dateOfBirth: string; dateOfExpiry: string },
): Promise<{ error?: string }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const now = new Date().toISOString();
  const { error } = await supabase.auth.updateUser({
    data: {
      ...(user.user_metadata ?? {}),
      nfc_verified_at: now,
      nfc_verified: true,
      national_id: card.nationalId,
      verified_surname: card.surname,
      verified_given_names: card.givenNames,
      id_doc_number: bac.docNumber,
      id_dob_yymmdd: bac.dateOfBirth,
      id_exp_yymmdd: bac.dateOfExpiry,
    },
  });

  if (error) return { error: error.message };
  await supabase.auth.refreshSession();
  markIdentityVerifiedLocal(userId);
  return {};
};

export const saveLivenessVerification = async (userId: string): Promise<{ error?: string }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const now = new Date().toISOString();
  const { error } = await supabase.auth.updateUser({
    data: {
      ...(user.user_metadata ?? {}),
      liveness_verified_at: now,
      liveness_verified: true,
    },
  });

  if (error) return { error: error.message };
  await supabase.auth.refreshSession();
  markIdentityVerifiedLocal(userId);
  return {};
};

export const cardDataFromStored = (stored: StoredIdentityMeta): EidCardData | null => {
  if (!stored.nfcVerified || !stored.nationalId) return null;
  return {
    verified: true,
    format: "TD1",
    documentType: "I",
    country: "TUR",
    documentNumber: stored.docNumber ?? "",
    nationalId: stored.nationalId,
    surname: stored.surname ?? "",
    givenNames: stored.givenNames ?? "",
    dateOfBirth: stored.dobYymmdd ?? "",
    sex: "",
    dateOfExpiry: stored.expYymmdd ?? "",
    nationality: "TUR",
    mrzLine1: "",
    mrzLine2: "",
  };
};

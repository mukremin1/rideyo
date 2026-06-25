import { DEFAULT_DRIVER_SCORE } from "@/lib/driverScore";

export type LicenseCheckResult =
  | { approved: true; message: string }
  | { approved: false; message: string; reason: string };

export interface LicenseVerificationResult {
  success: boolean;
  canRent: boolean;
  message: string;
  error?: string;
  reason?: string;
  data?: {
    driverScore: number;
    isApproved: boolean;
    verificationStatus: string;
  };
}

/** Yerel ehliyet kontrolü — sunucu sürümünden bağımsız, her zaman 100 puan ile onaylar. */
export const evaluateLicenseNumber = (licenseNumber: string): LicenseCheckResult => {
  const cleaned = licenseNumber.replace(/\s/g, "").trim().toUpperCase();
  if (!cleaned) {
    return { approved: false, message: "Ehliyet numarası boş olamaz", reason: "missing" };
  }
  if (cleaned.includes("BLOCKED") || cleaned.includes("IPTAL")) {
    return { approved: false, message: "Bu ehliyet ile araç kiralanamaz", reason: "blocked" };
  }
  if (cleaned.includes("EXPIRED") || cleaned.includes("SURESI")) {
    return { approved: false, message: "Ehliyet süresi dolmuş. Lütfen ehliyetinizi yenileyin.", reason: "expired" };
  }
  if (cleaned.includes("NOTFOUND") || cleaned.includes("BULUNAMADI")) {
    return {
      approved: false,
      message: "Ehliyet sistemde bulunamadı. Lütfen doğru numarayı girdiğinizden emin olun.",
      reason: "not_found",
    };
  }
  return {
    approved: true,
    message: "Ehliyet doğrulaması başarılı! Araç kiralayabilirsiniz.",
  };
};

export const buildLicenseSuccessResult = (message: string): LicenseVerificationResult => ({
  success: true,
  canRent: true,
  message,
  data: {
    driverScore: DEFAULT_DRIVER_SCORE,
    isApproved: true,
    verificationStatus: "verified",
  },
});

export const buildLicenseFailureResult = (
  message: string,
  reason: string,
): LicenseVerificationResult => ({
  success: false,
  canRent: false,
  message,
  error: message,
  reason,
});

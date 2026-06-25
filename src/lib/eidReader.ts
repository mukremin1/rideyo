import { Capacitor, registerPlugin } from "@capacitor/core";
import { abortNfcScan } from "@/lib/nfc";

export interface EidMrzInput {
  /** Cüzdan seri numarası (belge numarası), ör: "A12345678". BAC anahtarı için gerekli. */
  docNumber: string;
  /** Doğum tarihi YYMMDD formatında, ör: "900115" */
  dateOfBirth: string;
  /** Son geçerlilik tarihi YYMMDD formatında, ör: "301231" */
  dateOfExpiry: string;
}

export interface EidCardData {
  verified: true;
  format: "TD1" | "TD3";
  documentType: string;
  country: string;
  documentNumber: string;
  /** T.C. Kimlik Numarası (TD1 opsiyonel alan veya TD3 opsiyonel alan) */
  nationalId: string;
  surname: string;
  givenNames: string;
  dateOfBirth: string;
  sex: string;
  dateOfExpiry: string;
  nationality: string;
  mrzLine1: string;
  mrzLine2: string;
  mrzLine3?: string;
}

export type EidReadResult =
  | { ok: true; data: EidCardData }
  | { ok: false; reason: "unsupported" | "cancelled" | "error"; errorMessage: string };

interface EidReaderPlugin {
  readIdCard(options: EidMrzInput): Promise<EidCardData>;
  stopReading(): Promise<void>;
}

const EidReaderNative = registerPlugin<EidReaderPlugin>("EidReader");

const isNativeMobile = (): boolean =>
  Capacitor.isNativePlatform() && ["android", "ios"].includes(Capacitor.getPlatform());

export const readIdCard = async (input: EidMrzInput): Promise<EidReadResult> => {
  if (!isNativeMobile()) {
    return { ok: false, reason: "unsupported", errorMessage: "NFC kimlik okuma yalnızca mobil cihazlarda desteklenir." };
  }

  // Stop any active @capgo/capacitor-nfc session before starting the EidReader session.
  // Both plugins call enableReaderMode; only one can hold it at a time on Android.
  await abortNfcScan();

  // Give the NFC stack 600ms to fully release before switching reader mode.
  await new Promise<void>((resolve) => setTimeout(resolve, 600));

  try {
    const data = await EidReaderNative.readIdCard(input);
    return { ok: true, data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const lower = msg.toLowerCase();
    if (lower.includes("iptal") || lower.includes("cancel")) {
      return { ok: false, reason: "cancelled", errorMessage: msg };
    }
    return { ok: false, reason: "error", errorMessage: msg };
  }
};

export const stopIdCardReading = async (): Promise<void> => {
  if (!isNativeMobile()) return;
  try {
    await EidReaderNative.stopReading();
  } catch {
    // best effort
  }
};

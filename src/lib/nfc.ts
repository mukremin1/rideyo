import { Capacitor } from "@capacitor/core";
import { CapacitorNfc, type NfcEvent, type NfcTag } from "@capgo/capacitor-nfc";

type NfcFailureReason = "unsupported" | "disabled" | "timeout" | "error";

export interface NfcScanResult {
  ok: boolean;
  event?: NfcEvent;
  reason?: NfcFailureReason;
  errorMessage?: string;
}

interface ScanOnceOptions {
  timeoutMs?: number;
  alertMessage?: string;
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("TIMEOUT"));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
};

// Turkish ID cards (T.C. Kimlik Kartı) are ISO 14443-4 smart cards — they appear as
// "android.nfc.tech.IsoDep" on Android. Simple sticker tags (NfcA/NfcV only) are rejected.
// On iOS the plugin does not populate techTypes, so we fall back to accepting any tag with a UID.
export const isValidIdCardTag = (tag: NfcTag | null | undefined): boolean => {
  if (!tag) return false;
  if (!tag.id || tag.id.length === 0) return false;

  const techs = (tag.techTypes ?? []).map((t) => t.toLowerCase());
  if (techs.length > 0) {
    return techs.some((t) => t.includes("isodep") || t.includes("iso-dep") || t.includes("iso7816"));
  }

  // iOS: techTypes not populated by this plugin — accept any tag that has a valid UID.
  return true;
};

export const abortNfcScan = async (): Promise<void> => {
  try {
    await CapacitorNfc.stopScanning();
  } catch {
    // best effort
  }
};

export const scanNfcOnce = async (options?: ScanOnceOptions): Promise<NfcScanResult> => {
  const timeoutMs = options?.timeoutMs ?? 20000;
  const platform = Capacitor.getPlatform();
  const isNativeMobile = Capacitor.isNativePlatform() && ["android", "ios"].includes(platform);

  if (!isNativeMobile) {
    return { ok: false, reason: "unsupported" };
  }

  try {
    const { status } = await CapacitorNfc.getStatus();
    if (status === "NO_NFC") {
      return { ok: false, reason: "unsupported" };
    }
    if (status === "NFC_DISABLED") {
      return { ok: false, reason: "disabled" };
    }

    // Show the Android alert BEFORE starting the timeout so the dialog display time
    // does not count against the scan window.
    if (platform === "android" && options?.alertMessage) {
      window.alert(options.alertMessage);
    }

    const scanPromise = new Promise<NfcEvent>((resolve, reject) => {
      void (async () => {
        const listener = await CapacitorNfc.addListener("nfcEvent", async (event) => {
          try {
            await listener.remove();
            await CapacitorNfc.stopScanning();
          } catch {
            // Best effort cleanup.
          }
          resolve(event);
        });

        try {
          await CapacitorNfc.startScanning({
            invalidateAfterFirstRead: true,
            alertMessage: platform === "ios" ? options?.alertMessage : undefined,
          });
        } catch (error) {
          try {
            await listener.remove();
          } catch {
            // Best effort cleanup.
          }
          reject(error);
        }
      })().catch(reject);
    });

    const event = await withTimeout(scanPromise, timeoutMs);
    return { ok: true, event };
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "TIMEOUT") {
      try {
        await CapacitorNfc.stopScanning();
      } catch {
        // Best effort cleanup.
      }
      return { ok: false, reason: "timeout" };
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown NFC error";
    return { ok: false, reason: "error", errorMessage };
  }
};

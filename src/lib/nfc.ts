import { Capacitor } from "@capacitor/core";
import { CapacitorNfc, type NfcEvent } from "@capgo/capacitor-nfc";

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
          // `alertMessage` is iOS-only in this plugin. Show a simple fallback alert on Android.
          if (platform === "android" && options?.alertMessage) {
            window.alert(options.alertMessage);
          }

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

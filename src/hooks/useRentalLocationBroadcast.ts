import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { reportRentalLocation } from "@/lib/rentalLocation";

const DEFAULT_INTERVAL_MS = 30_000;

async function readPosition(): Promise<GeolocationPosition | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== "granted" && permission.coarseLocation !== "granted") {
        return null;
      }

      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15_000,
      });

      return {
        coords: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        },
      } as GeolocationPosition;
    }

    if (!navigator.geolocation) return null;

    return await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      });
    });
  } catch {
    return null;
  }
}

export function useRentalLocationBroadcast(options: {
  bookingId: string | null;
  carId: string | null;
  enabled: boolean;
  intervalMs?: number;
}) {
  const busyRef = useRef(false);

  useEffect(() => {
    if (!options.enabled || !options.bookingId || !options.carId) return;

    const bookingId = options.bookingId;
    const carId = options.carId;
    const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;

    const tick = async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const position = await readPosition();
        if (!position) return;

        await reportRentalLocation({
          bookingId,
          carId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      } finally {
        busyRef.current = false;
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), intervalMs);
    return () => window.clearInterval(timer);
  }, [options.enabled, options.bookingId, options.carId, options.intervalMs]);
}

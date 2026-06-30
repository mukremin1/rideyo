import { useState, useEffect, useCallback, useRef } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import i18n from "@/i18n";

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  permission: "granted" | "denied" | "prompt" | "unknown";
}

export type GeolocationHookValue = GeolocationState & {
  getCurrentPosition: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  calculateDistance: (lat2: number, lon2: number) => number | null;
};

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function isGranted(status: string | undefined): boolean {
  return status === "granted" || status === "prompt-with-rationale";
}

export const useGeolocationState = (): GeolocationHookValue => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: true,
    error: null,
    permission: "unknown",
  });

  const requestingRef = useRef(false);

  const applyPosition = useCallback((latitude: number, longitude: number, accuracy: number | null) => {
    setState({
      latitude,
      longitude,
      accuracy,
      loading: false,
      error: null,
      permission: "granted",
    });
  }, []);

  const applyError = useCallback((errorMessage: string, permission: GeolocationState["permission"] = "unknown") => {
    setState((prev) => ({
      ...prev,
      loading: false,
      error: errorMessage,
      permission: permission === "unknown" ? prev.permission : permission,
    }));
  }, []);

  const getCurrentPositionWeb = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        applyError(i18n.t("geolocation.unsupported"));
        resolve();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          applyPosition(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
          resolve();
        },
        (error) => {
          let errorMessage = i18n.t("geolocation.failed");
          let permission: GeolocationState["permission"] = "unknown";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = i18n.t("geolocation.denied");
              permission = "denied";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = i18n.t("geolocation.unavailable");
              break;
            case error.TIMEOUT:
              errorMessage = i18n.t("geolocation.timeout");
              break;
          }
          applyError(errorMessage, permission);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    });
  }, [applyError, applyPosition]);

  const getCurrentPositionNative = useCallback(async (): Promise<void> => {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      });
      applyPosition(position.coords.latitude, position.coords.longitude, position.coords.accuracy ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/denied|permission/i.test(message)) {
        applyError(i18n.t("geolocation.denied"), "denied");
      } else {
        applyError(i18n.t("geolocation.failed"));
      }
    }
  }, [applyError, applyPosition]);

  const getCurrentPosition = useCallback(async () => {
    if (requestingRef.current) return;
    requestingRef.current = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      if (Capacitor.isNativePlatform()) {
        await getCurrentPositionNative();
      } else {
        await getCurrentPositionWeb();
      }
    } finally {
      requestingRef.current = false;
    }
  }, [getCurrentPositionNative, getCurrentPositionWeb]);

  const checkNativePermission = useCallback(async (): Promise<GeolocationState["permission"]> => {
    try {
      const status = await Geolocation.checkPermissions();
      if (isGranted(status.location) || isGranted(status.coarseLocation)) {
        return "granted";
      }
      if (status.location === "denied" || status.coarseLocation === "denied") {
        return "denied";
      }
      return "prompt";
    } catch {
      return "unknown";
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await Geolocation.requestPermissions();
        const granted = isGranted(perm.location) || isGranted(perm.coarseLocation);
        if (!granted) {
          applyError(i18n.t("geolocation.settingsHint"), "denied");
          toast.error(i18n.t("geolocation.settingsHint"));
          return false;
        }
        await getCurrentPositionNative();
        return true;
      } catch {
        applyError(i18n.t("geolocation.failed"));
        return false;
      }
    }

    try {
      const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      if (result.state === "denied") {
        applyError(i18n.t("geolocation.settingsHint"), "denied");
        toast.error(i18n.t("geolocation.settingsHint"));
        return false;
      }
    } catch {
      // permissions API unavailable
    }

    await getCurrentPositionWeb();
    return true;
  }, [applyError, getCurrentPositionNative, getCurrentPositionWeb]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (Capacitor.isNativePlatform()) {
        const permission = await checkNativePermission();
        if (cancelled) return;
        setState((prev) => ({ ...prev, permission }));
        if (permission === "granted") {
          await getCurrentPositionNative();
          return;
        }
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }
      await getCurrentPositionWeb();
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [checkNativePermission, getCurrentPositionNative, getCurrentPositionWeb]);

  const calculateDistance = useCallback(
    (lat2: number, lon2: number): number | null => {
      if (state.latitude === null || state.longitude === null) return null;

      const R = 6371;
      const dLat = deg2rad(lat2 - state.latitude);
      const dLon = deg2rad(lon2 - state.longitude);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(state.latitude)) *
          Math.cos(deg2rad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    [state.latitude, state.longitude],
  );

  return {
    ...state,
    getCurrentPosition,
    requestPermission,
    calculateDistance,
  };
};

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

export const useGeolocation = (options?: PositionOptions) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: true,
    error: null,
  });

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Tarayıcınız konum servislerini desteklemiyor",
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
        });
      },
      (error) => {
        let errorMessage = "Konum alınamadı";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Konum izni reddedildi";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Konum bilgisi kullanılamıyor";
            break;
          case error.TIMEOUT:
            errorMessage = "Konum isteği zaman aşımına uğradı";
            break;
        }
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
        ...options,
      }
    );
  }, [options]);

  useEffect(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  const requestPermission = useCallback(async () => {
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      if (result.state === "denied") {
        toast.error("Konum izni reddedilmiş. Lütfen tarayıcı ayarlarından izin verin.");
        return false;
      }
      getCurrentPosition();
      return true;
    } catch {
      getCurrentPosition();
      return true;
    }
  }, [getCurrentPosition]);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = useCallback(
    (lat2: number, lon2: number): number | null => {
      if (state.latitude === null || state.longitude === null) return null;

      const R = 6371; // Radius of the earth in km
      const dLat = deg2rad(lat2 - state.latitude);
      const dLon = deg2rad(lon2 - state.longitude);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(state.latitude)) *
          Math.cos(deg2rad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const d = R * c; // Distance in km
      return d;
    },
    [state.latitude, state.longitude]
  );

  return {
    ...state,
    getCurrentPosition,
    requestPermission,
    calculateDistance,
  };
};

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

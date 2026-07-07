import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Car, 
  Unlock, 
  Lock, 
  Camera, 
  CheckCircle, 
  MapPin, 
  Key,
  Loader2,
  Navigation,
  Bell
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isBookingPaid, isRentalActive } from "@/lib/paymentStatus";
import { createSupabaseInvoker, invokeVehicleControl } from "@/lib/serverApi";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTranslation } from "react-i18next";
import VehiclePhotoCapture from "@/components/VehiclePhotoCapture";
import CarLocationMap from "@/components/CarLocationMap";
import { getRegionErrorKey, validateDropoffCoords } from "@/lib/allowedRegions";
import { useRentalLocationBroadcast } from "@/hooks/useRentalLocationBroadcast";
import { Checkbox } from "@/components/ui/checkbox";

interface RentalState {
  bookingId: string;
  carId: string;
  carName: string;
  rentalType: "minute" | "hour" | "day";
}

interface VehicleControlResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

const supabaseInvoke = createSupabaseInvoker((name, options) =>
  supabase.functions.invoke(name, options),
);

const StartRental = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { sendRentalNotification, permission: notifPermission, requestPermission: requestNotifPermission } = usePushNotifications();
  const { t, i18n } = useTranslation();
  const locationState = location.state as RentalState | null;
  const bookingIdParam = searchParams.get("bookingId");
  const activeBookingId = locationState?.bookingId ?? bookingIdParam ?? null;

  const [rentalInfo, setRentalInfo] = useState<RentalState | null>(
    locationState?.bookingId && locationState?.carId ? locationState : null,
  );

  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [locking, setLocking] = useState(false);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [damageNotes, setDamageNotes] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [rentalStarted, setRentalStarted] = useState(false);
  const [rentalEnded, setRentalEnded] = useState(false);
  const [carGPSData, setCarGPSData] = useState<{ latitude: number; longitude: number } | null>(null);
  const [lastGPSData, setLastGPSData] = useState<{ latitude: number; longitude: number } | null>(null);
  const [rentalStartTime, setRentalStartTime] = useState<Date | null>(null);
  const [prepaidEndTime, setPrepaidEndTime] = useState<Date | null>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [remainingMinutes, setRemainingMinutes] = useState(0);
  const [timeExpired, setTimeExpired] = useState(false);
  const warnedThresholds = useRef<Set<number>>(new Set());
  const [distanceKm, setDistanceKm] = useState(0);
  const [bookingValidationLoading, setBookingValidationLoading] = useState(true);
  const [bookingValidated, setBookingValidated] = useState(false);
  const [locationSharingConsent, setLocationSharingConsent] = useState(false);

  useRentalLocationBroadcast({
    bookingId: rentalInfo?.bookingId ?? null,
    carId: rentalInfo?.carId ?? null,
    enabled: rentalStarted && !rentalEnded && locationSharingConsent,
  });

  const NEAR_CAR_DISTANCE_METERS = 30;

  const callVehicleControl = async (body: Record<string, unknown>): Promise<VehicleControlResponse> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error(t("rental.sessionNotFound"));
    }
    const { data, error } = await invokeVehicleControl(body, session.access_token, supabaseInvoke);
    if (error) throw error;
    return (data ?? {}) as VehicleControlResponse;
  };

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const calculateDistanceKm = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
    const earthRadiusKm = 6371;
    const dLat = toRadians(b.latitude - a.latitude);
    const dLon = toRadians(b.longitude - a.longitude);
    const lat1 = toRadians(a.latitude);
    const lat2 = toRadians(b.latitude);
    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);
    const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return earthRadiusKm * c;
  };

  useEffect(() => {
    if (rentalStarted || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => console.error("Konum alınamadı:", error),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [rentalStarted]);

  // Araç GPS verilerini çek ve dinle
  useEffect(() => {
    if (!rentalInfo?.carId) return;

    const carId = rentalInfo.carId;
    const carName = rentalInfo.carName;

    const fetchCarGPS = async () => {
      const { data } = await supabase
        .from("cars")
        .select("latitude, longitude")
        .eq("id", carId)
        .maybeSingle();

      if (data?.latitude && data?.longitude) {
        setCarGPSData({ latitude: data.latitude, longitude: data.longitude });
      }
    };

    fetchCarGPS();

    // Real-time GPS updates
    const channel = supabase
      .channel(`rental-gps-${carId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "cars",
          filter: `id=eq.${carId}`,
        },
        (payload) => {
          const newData = payload.new as { latitude?: number | null; longitude?: number | null };
          if (newData.latitude && newData.longitude) {
            setCarGPSData({ latitude: newData.latitude, longitude: newData.longitude });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rentalInfo?.carId]);

  useEffect(() => {
    if (!rentalStarted || !carGPSData) return;
    if (!lastGPSData) {
      setLastGPSData(carGPSData);
      return;
    }

    const delta = calculateDistanceKm(lastGPSData, carGPSData);
    if (Number.isFinite(delta) && delta > 0) {
      setDistanceKm((prev) => prev + delta);
    }
    setLastGPSData(carGPSData);
  }, [carGPSData, rentalStarted, lastGPSData]);

  useEffect(() => {
    if (!rentalStarted || !rentalStartTime) return;

    const tick = () => {
      const diffMs = Date.now() - rentalStartTime.getTime();
      setElapsedMinutes(Math.max(0, Math.floor(diffMs / 60000)));

      if (prepaidEndTime) {
        const remainingMs = prepaidEndTime.getTime() - Date.now();
        const remaining = Math.max(0, Math.ceil(remainingMs / 60000));
        setRemainingMinutes(remaining);
        const expired = remainingMs <= 0;
        setTimeExpired(expired);

        if (rentalInfo?.rentalType === "minute" || rentalInfo?.rentalType === "hour") {
          if (remaining === 5 && !warnedThresholds.current.has(5)) {
            warnedThresholds.current.add(5);
            toast.warning(t("rental.timeWarning5"));
          }
          if (remaining === 1 && !warnedThresholds.current.has(1)) {
            warnedThresholds.current.add(1);
            toast.warning(t("rental.timeWarning1"));
          }
          if (expired && !warnedThresholds.current.has(0)) {
            warnedThresholds.current.add(0);
            toast.error(t("rental.timeExpired"));
          }
        }
      }
    };

    tick();
    const timer = setInterval(tick, 10000);
    return () => clearInterval(timer);
  }, [rentalStarted, rentalStartTime, prepaidEndTime, rentalInfo?.rentalType, t]);

  useEffect(() => {
    const validateAndLoadBooking = async () => {
      if (!user) {
        setBookingValidationLoading(false);
        setBookingValidated(false);
        return;
      }

      if (!activeBookingId) {
        setBookingValidationLoading(false);
        setBookingValidated(false);
        return;
      }

      setBookingValidationLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("id, user_id, payment_status, car_id, rental_type, start_time, end_time, cars(name)")
        .eq("id", activeBookingId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        toast.error(t("rental.validationFailed"));
        setBookingValidated(false);
        setBookingValidationLoading(false);
        navigate("/cars");
        return;
      }

      if (!isBookingPaid(data.payment_status)) {
        toast.error(t("rental.paymentRequired"));
        setBookingValidated(false);
        setBookingValidationLoading(false);
        navigate("/payment", {
          state: {
            bookingId: data.id,
            carId: data.car_id,
            carName: data.cars?.name ?? t("rental.defaultCarName"),
          },
        });
        return;
      }

      const rentalType =
        data.rental_type === "hour" || data.rental_type === "day" ? data.rental_type : "minute";

      setRentalInfo({
        bookingId: data.id,
        carId: locationState?.carId ?? data.car_id,
        carName: locationState?.carName ?? data.cars?.name ?? t("rental.defaultCarName"),
        rentalType,
      });
      setBookingValidated(true);

      if (isRentalActive(data.payment_status)) {
        setRentalStarted(true);
        setLocationSharingConsent(true);
        setRentalStartTime(new Date(data.start_time));
        if (data.end_time) {
          setPrepaidEndTime(new Date(data.end_time));
        }
      }

      setBookingValidationLoading(false);
    };

    void validateAndLoadBooking();
  }, [activeBookingId, locationState?.carId, locationState?.carName, navigate, user]);

  if (!activeBookingId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg text-center">
            <Card className="p-8">
              <h1 className="text-2xl font-bold text-foreground mb-4">{t("rental.noInfo")}</h1>
              <p className="text-muted-foreground mb-6">{t("rental.noInfoDesc")}</p>
              <Button onClick={() => navigate("/cars")}>{t("common.goToCars")}</Button>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg text-center">
            <Card className="p-8">
              <h1 className="text-2xl font-bold text-foreground mb-4">{t("rental.loginRequired")}</h1>
              <p className="text-muted-foreground mb-6">{t("rental.loginRequiredDesc")}</p>
              <Button onClick={() => navigate("/auth")}>{t("common.goToAuth")}</Button>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (bookingValidationLoading || !bookingValidated || !rentalInfo) {
    if (bookingValidationLoading) {
      return (
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="pt-24 pb-12">
            <div className="container mx-auto px-4 max-w-lg text-center">
              <Card className="p-8">
                <h1 className="text-xl font-semibold text-foreground mb-4">{t("rental.checking")}</h1>
                <p className="text-muted-foreground">{t("rental.checkingDesc")}</p>
              </Card>
            </div>
          </main>
          <Footer />
        </div>
      );
    }
    return null;
  }

  const distanceToCarMeters =
    userLocation && carGPSData
      ? calculateDistanceKm(
          { latitude: userLocation.lat, longitude: userLocation.lng },
          carGPSData,
        ) * 1000
      : null;

  const hasCarPosition = Boolean(carGPSData);
  const nearCar =
    Boolean(userLocation) &&
    (!hasCarPosition ||
      (distanceToCarMeters !== null && distanceToCarMeters <= NEAR_CAR_DISTANCE_METERS));

  const handleUnlockCar = async () => {
    if (!user) return;
    setUnlocking(true);

    try {
      const data = await callVehicleControl({
        action: "unlock",
        carId: rentalInfo.carId,
        bookingId: rentalInfo.bookingId,
        userId: user.id,
        latitude: userLocation?.lat,
        longitude: userLocation?.lng,
      });

      if (data.success) {
        toast.success(data.message);
      } else {
        throw new Error(data.error);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("rental.unlockFailed");
      toast.error(message);
    } finally {
      setUnlocking(false);
    }
  };

  const handleLockCar = async () => {
    if (!user) return;
    setLocking(true);

    try {
      const data = await callVehicleControl({
        action: "lock",
        carId: rentalInfo.carId,
        bookingId: rentalInfo.bookingId,
        userId: user.id,
        latitude: userLocation?.lat,
        longitude: userLocation?.lng,
      });

      const response = data;
      if (response.success) {
        toast.success(response.message ?? t("rental.lockSuccess"));
      } else {
        throw new Error(response.error ?? t("rental.lockFailed"));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("rental.lockFailed");
      toast.error(message);
    } finally {
      setLocking(false);
    }
  };

  const handleStartRental = async () => {
    if (!bookingValidated || !user) {
      toast.error(t("rental.validationRetry"));
      return;
    }

    if (!userLocation) {
      toast.error(t("rental.locationRequired"));
      return;
    }

    if (!nearCar) {
      toast.error(
        t("rental.notNearCar", {
          meters: NEAR_CAR_DISTANCE_METERS,
          current: Math.round(distanceToCarMeters ?? 0),
        }),
      );
      return;
    }

    if (!locationSharingConsent) {
      toast.error(t("rental.locationConsentRequired"));
      return;
    }

    setLoading(true);

    try {
      const data = await callVehicleControl({
        action: "start_rental",
        carId: rentalInfo.carId,
        bookingId: rentalInfo.bookingId,
        userId: user.id,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        notes: "Kiralama arac yaninda baslatildi",
      });

      if (data.success) {
        toast.success(t("rental.startSuccess"));
        sendRentalNotification("start", rentalInfo.carName);
        setRentalStarted(true);
        warnedThresholds.current.clear();

        const { data: bookingRow } = await supabase
          .from("bookings")
          .select("start_time, end_time")
          .eq("id", rentalInfo.bookingId)
          .maybeSingle();

        if (bookingRow?.start_time) {
          setRentalStartTime(new Date(bookingRow.start_time));
        } else {
          setRentalStartTime(new Date());
        }
        if (bookingRow?.end_time) {
          setPrepaidEndTime(new Date(bookingRow.end_time));
        }

        if (carGPSData) {
          setLastGPSData(carGPSData);
        }
      } else {
        throw new Error(data.error ?? t("rental.startFailed"));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("rental.startFailed");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEndRental = async (options?: { skipPhotos?: boolean; autoExpired?: boolean }) => {
    if (!user) return;
    if (!options?.skipPhotos && afterPhotos.length === 0) {
      toast.error(t("rental.takePhotosFirst"));
      return;
    }

    setLoading(true);

    try {
      let lat = userLocation?.lat;
      let lng = userLocation?.lng;

      if (lat == null || lng == null) {
        if (!navigator.geolocation) {
          toast.error(t("rental.dropoffLocationRequired"));
          setLoading(false);
          return;
        }
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
          });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        setUserLocation({ lat, lng });
      }

      const dropoff = await validateDropoffCoords(lat, lng, i18n.language);
      const flexibleRental =
        rentalInfo.rentalType === "minute" || rentalInfo.rentalType === "hour";
      if (!flexibleRental && dropoff.strictMode && !dropoff.allowed) {
        toast.error(t(`rental.region.${getRegionErrorKey(dropoff.reason)}`));
        setLoading(false);
        return;
      }

      // Fotoğrafları kaydet
      if (!options?.skipPhotos) {
        for (const photo of afterPhotos) {
          await supabase.from('vehicle_photos').insert({
            booking_id: rentalInfo.bookingId,
            car_id: rentalInfo.carId,
            user_id: user.id,
            photo_type: 'after_rental',
            photo_url: photo,
            notes: damageNotes || null,
          });
        }
      }

      const endNotes = options?.autoExpired
        ? `On odemeli sure doldu — otomatik bitirildi. Konum: ${dropoff.address || ""}`
        : `Anahtar torpidoya bırakıldı. Konum: ${dropoff.address || ""}`;

      // Kiralamayı bitir
      const data = await callVehicleControl({
        action: "end_rental",
        carId: rentalInfo.carId,
        bookingId: rentalInfo.bookingId,
        userId: user.id,
        latitude: lat,
        longitude: lng,
        city: dropoff.parsed.il || undefined,
        district: dropoff.parsed.ilce || undefined,
        neighborhood: dropoff.parsed.mahalle || undefined,
        dropoffAddress: dropoff.address,
        notes: endNotes,
      });

      const response = data;
      if (response.success) {
        toast.success(t("rental.endSuccess"));
        setRentalEnded(true);
      } else {
        const err = response as VehicleControlResponse & { reason?: string };
        if (err.error === "DROP_OFF_NOT_ALLOWED") {
          toast.error(t(`rental.region.${getRegionErrorKey(err.reason)}`));
          return;
        }
        if (err.error === "DROP_OFF_LOCATION_REQUIRED") {
          toast.error(t("rental.dropoffLocationRequired"));
          return;
        }
        throw new Error(response.error ?? t("rental.endFailed"));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("rental.endFailed");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const renderReadyToStart = () => (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Car className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t("rental.readyTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("rental.readyDesc")}</p>
        </div>
      </div>

      {carGPSData && (
        <div className="mb-6">
          <CarLocationMap latitude={carGPSData.latitude} longitude={carGPSData.longitude} carName={rentalInfo.carName} />
        </div>
      )}

      <div className="space-y-4 mb-6">
        {!userLocation ? (
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            {t("rental.waitingLocation")}
          </div>
        ) : hasCarPosition && distanceToCarMeters !== null ? (
          <div
            className={`flex items-center gap-3 p-4 rounded-lg ${
              nearCar ? "bg-green-500/10" : "bg-amber-500/10"
            }`}
          >
            <MapPin className={`w-5 h-5 shrink-0 ${nearCar ? "text-green-600" : "text-amber-600"}`} />
            <div>
              <p className={`font-medium ${nearCar ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
                {nearCar ? t("rental.atCar") : t("rental.approachCar")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("rental.distanceToCar", { meters: Math.round(distanceToCarMeters) })}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground">{t("rental.nearCar")}</p>
          </div>
        )}
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <Checkbox
          id="location-sharing-consent"
          checked={locationSharingConsent}
          onCheckedChange={(checked) => setLocationSharingConsent(checked === true)}
        />
        <div className="space-y-1">
          <Label htmlFor="location-sharing-consent" className="cursor-pointer font-medium leading-snug">
            {t("rental.locationConsentLabel")}
          </Label>
          <p className="text-sm text-muted-foreground">{t("rental.locationConsentDesc")}</p>
        </div>
      </div>

      <Button
        size="lg"
        className="w-full gap-2 bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] shadow-[0_12px_30px_-10px_hsl(var(--primary)/0.55)] hover:opacity-95"
        onClick={handleStartRental}
        disabled={loading || !locationSharingConsent || !nearCar}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {t("rental.starting")}
          </>
        ) : (
          <>
            <Key className="w-5 h-5" />
            {t("rental.startRental")}
          </>
        )}
      </Button>

      {hasCarPosition && !nearCar && userLocation && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t("rental.startWhenNear", { meters: NEAR_CAR_DISTANCE_METERS })}
        </p>
      )}
    </Card>
  );

  const renderActiveRental = () => (
    <div className="space-y-6">
      <Card className="p-6 border-green-500/20 bg-green-500/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <Car className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-green-700 dark:text-green-400">{t("rental.activeRental")}</h2>
            <p className="text-sm text-muted-foreground">{rentalInfo.carName}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleUnlockCar}
            disabled={unlocking}
          >
            {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
            {t("rental.unlockDoorsActive")}
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleLockCar}
            disabled={locking}
          >
            {locking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {t("rental.lockDoors")}
          </Button>
        </div>
        {timeExpired && (rentalInfo.rentalType === "minute" || rentalInfo.rentalType === "hour") && (
          <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {t("rental.timeExpiredBanner")}
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-background rounded-lg border border-border">
            <p className="text-muted-foreground">{t("rental.elapsedTime")}</p>
            <p className="text-lg font-semibold">{elapsedMinutes} {t("rental.minutes")}</p>
          </div>
          {prepaidEndTime && (rentalInfo.rentalType === "minute" || rentalInfo.rentalType === "hour") ? (
            <div className={`p-3 rounded-lg border ${timeExpired ? "border-destructive/50 bg-destructive/5" : "border-border bg-background"}`}>
              <p className="text-muted-foreground">{t("rental.remainingTime")}</p>
              <p className={`text-lg font-semibold ${timeExpired ? "text-destructive" : ""}`}>
                {remainingMinutes} {t("rental.minutes")}
              </p>
            </div>
          ) : (
            <div className="p-3 bg-background rounded-lg border border-border">
              <p className="text-muted-foreground">{t("rental.totalDistance")}</p>
              <p className="text-lg font-semibold">{distanceKm.toFixed(2)} {t("rental.km")}</p>
            </div>
          )}
        </div>
        {prepaidEndTime && (rentalInfo.rentalType === "minute" || rentalInfo.rentalType === "hour") && (
          <div className="mt-4 grid grid-cols-1 gap-4 text-sm">
            <div className="p-3 bg-background rounded-lg border border-border">
              <p className="text-muted-foreground">{t("rental.totalDistance")}</p>
              <p className="text-lg font-semibold">{distanceKm.toFixed(2)} {t("rental.km")}</p>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">{t("rental.liveLocation")}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bell className="w-4 h-4" />
            <span>
              {locationSharingConsent
                ? t("rental.phoneTrackingActive")
                : t("rental.locationUpdates")}
            </span>
          </div>
        </div>

        {carGPSData ? (
          <CarLocationMap latitude={carGPSData.latitude} longitude={carGPSData.longitude} carName={rentalInfo.carName} />
        ) : (
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
            <div className="text-muted-foreground">{t("rental.gpsWaiting")}</div>
          </div>
        )}

        {carGPSData && (
          <div className="mt-4 text-sm text-muted-foreground">
            {carGPSData.latitude.toFixed(6)}, {carGPSData.longitude.toFixed(6)}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t("rental.endRental")}</h2>
            <p className="text-sm text-muted-foreground">{t("rental.endPhotosDesc")}</p>
          </div>
        </div>

        <VehiclePhotoCapture onPhotosChange={setAfterPhotos} photos={afterPhotos} maxPhotos={4} />

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="endDamageNotes">{t("rental.damageNotes")}</Label>
            <Textarea
              id="endDamageNotes"
              placeholder={t("rental.endDamagePlaceholder")}
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              className="mt-2"
            />
          </div>

          <div className="p-4 bg-amber-500/10 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">{t("rental.dropoffZoneHint")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">{t("rental.keyInGlovebox")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("rental.keyInGloveboxDesc")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Button
          size="lg"
          variant="destructive"
          className="w-full mt-6 gap-2"
          onClick={handleEndRental}
          disabled={loading || afterPhotos.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t("rental.ending")}
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              {t("rental.endAndLock")}
            </>
          )}
        </Button>
      </Card>
    </div>
  );

  const renderCompleted = () => (
    <Card className="p-8 text-center">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">{t("rental.completedTitle")}</h1>
      <p className="text-muted-foreground mb-6">
        {t("rental.completedDesc", { carName: rentalInfo.carName })}
      </p>
      <Button onClick={() => navigate("/my-bookings")}>
        {t("rental.goToBookings")}
      </Button>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-lg">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {rentalEnded
              ? t("rental.titleCompleted")
              : rentalStarted
                ? t("rental.titleActive")
                : t("rental.titleStart")}
          </h1>
          <p className="text-muted-foreground mb-8">{rentalInfo.carName}</p>

          {rentalEnded ? renderCompleted() : rentalStarted ? renderActiveRental() : renderReadyToStart()}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StartRental;



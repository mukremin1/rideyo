import { useState, useEffect } from "react";
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
  AlertTriangle,
  Key,
  ArrowRight,
  Loader2,
  Navigation,
  Bell
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isBookingPaid } from "@/lib/paymentStatus";
import { createSupabaseInvoker, invokeVehicleControl } from "@/lib/serverApi";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTranslation } from "react-i18next";
import VehiclePhotoCapture from "@/components/VehiclePhotoCapture";
import CarLocationMap from "@/components/CarLocationMap";

interface RentalState {
  bookingId: string;
  carId: string;
  carName: string;
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
  const { t } = useTranslation();
  const locationState = location.state as RentalState | null;
  const bookingIdParam = searchParams.get("bookingId");
  const activeBookingId = locationState?.bookingId ?? bookingIdParam ?? null;

  const [rentalInfo, setRentalInfo] = useState<RentalState | null>(
    locationState?.bookingId && locationState?.carId ? locationState : null,
  );

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [locking, setLocking] = useState(false);
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [damageNotes, setDamageNotes] = useState("");
  const [carLocation, setCarLocation] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [rentalStarted, setRentalStarted] = useState(false);
  const [rentalEnded, setRentalEnded] = useState(false);
  const [carGPSData, setCarGPSData] = useState<{ latitude: number; longitude: number } | null>(null);
  const [lastGPSData, setLastGPSData] = useState<{ latitude: number; longitude: number } | null>(null);
  const [rentalStartTime, setRentalStartTime] = useState<Date | null>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [lastAutoUnlockAt, setLastAutoUnlockAt] = useState<number | null>(null);
  const [autoUnlockArmed, setAutoUnlockArmed] = useState(true);
  const [bookingValidationLoading, setBookingValidationLoading] = useState(true);
  const [bookingValidated, setBookingValidated] = useState(false);
  const [carUnlocked, setCarUnlocked] = useState(false);

  const AUTO_UNLOCK_DISTANCE_METERS = 30;
  const AUTO_UNLOCK_RESET_DISTANCE_METERS = 60;
  const AUTO_UNLOCK_INTERVAL_MS = 15000;

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
    // Kullanıcı konumunu al
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error("Konum alınamadı:", error)
      );
    }
  }, []);

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
            // Konum güncelleme bildirimi gönder
            if (rentalStarted) {
              sendRentalNotification("location", carName, t("rental.locationUpdated"));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rentalInfo?.carId, rentalInfo?.carName, rentalStarted, sendRentalNotification]);

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
    if (rentalStarted || unlocking) return;
    if (!userLocation || !carGPSData) return;
    if (step !== 1) return;

    const checkAndUnlock = () => {
      const distanceKm = calculateDistanceKm(
        { latitude: userLocation.lat, longitude: userLocation.lng },
        carGPSData
      );

      if (!Number.isFinite(distanceKm)) return;

      const distanceMeters = distanceKm * 1000;

      if (distanceMeters >= AUTO_UNLOCK_RESET_DISTANCE_METERS && !autoUnlockArmed) {
        setAutoUnlockArmed(true);
        return;
      }

      if (distanceMeters <= AUTO_UNLOCK_DISTANCE_METERS && autoUnlockArmed) {
        const now = Date.now();
        if (!lastAutoUnlockAt || now - lastAutoUnlockAt >= AUTO_UNLOCK_INTERVAL_MS) {
          setLastAutoUnlockAt(now);
          setAutoUnlockArmed(false);
          handleUnlockCar();
        }
      }
    };

    checkAndUnlock();
    const interval = setInterval(checkAndUnlock, AUTO_UNLOCK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [rentalStarted, unlocking, userLocation, carGPSData, step, lastAutoUnlockAt, autoUnlockArmed]);

  useEffect(() => {
    if (!rentalStarted || !rentalStartTime) return;

    const timer = setInterval(() => {
      const diffMs = Date.now() - rentalStartTime.getTime();
      setElapsedMinutes(Math.max(0, Math.floor(diffMs / 60000)));
    }, 30000);

    return () => clearInterval(timer);
  }, [rentalStarted, rentalStartTime]);

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
        .select("id, user_id, payment_status, car_id, cars(name)")
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

      setRentalInfo({
        bookingId: data.id,
        carId: locationState?.carId ?? data.car_id,
        carName: locationState?.carName ?? data.cars?.name ?? t("rental.defaultCarName"),
      });
      setBookingValidated(true);
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
        setCarUnlocked(true);
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
    if (!bookingValidated) {
      toast.error(t("rental.validationRetry"));
      return;
    }

    if (!carUnlocked) {
      toast.error(t("rental.unlockBeforeStart"));
      return;
    }

    if (!user || beforePhotos.length === 0) {
      toast.error(t("rental.takePhotosFirst"));
      return;
    }

    setLoading(true);

    try {
      // Fotoğrafları kaydet
      for (const photo of beforePhotos) {
        await supabase.from('vehicle_photos').insert({
          booking_id: rentalInfo.bookingId,
          car_id: rentalInfo.carId,
          user_id: user.id,
          photo_type: 'before_rental',
          photo_url: photo,
          notes: damageNotes || null,
        });
      }

      // Kiralamayı başlat
      const data = await callVehicleControl({
        action: "start_rental",
        carId: rentalInfo.carId,
        bookingId: rentalInfo.bookingId,
        userId: user.id,
        latitude: userLocation?.lat,
        longitude: userLocation?.lng,
        notes: `Konum: ${carLocation}`,
      });

      const response = data;
      if (response.success) {
        toast.success(t("rental.startSuccess"));
        sendRentalNotification("start", rentalInfo.carName);
        setRentalStarted(true);
        const startTime = new Date();
        setRentalStartTime(startTime);
        if (carGPSData) {
          setLastGPSData(carGPSData);
        }
        setStep(4);
      } else {
        throw new Error(response.error ?? t("rental.startFailed"));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("rental.startFailed");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEndRental = async () => {
    if (!user || afterPhotos.length === 0) {
      toast.error(t("rental.takePhotosFirst"));
      return;
    }

    setLoading(true);

    try {
      // Fotoğrafları kaydet
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

      // Kiralamayı bitir
      const data = await callVehicleControl({
        action: "end_rental",
        carId: rentalInfo.carId,
        bookingId: rentalInfo.bookingId,
        userId: user.id,
        latitude: userLocation?.lat,
        longitude: userLocation?.lng,
        notes: `Anahtar torpidoya bırakıldı. Konum: ${carLocation}`,
      });

      const response = data;
      if (response.success) {
        toast.success(t("rental.endSuccess"));
        setRentalEnded(true);
      } else {
        throw new Error(response.error ?? t("rental.endFailed"));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("rental.endFailed");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const renderUnlockStep = () => (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Unlock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t("rental.step1Title")}</h2>
          <p className="text-sm text-muted-foreground">{t("rental.step1Desc")}</p>
        </div>
      </div>

      {carGPSData && (
        <div className="mb-6">
          <CarLocationMap latitude={carGPSData.latitude} longitude={carGPSData.longitude} carName={rentalInfo.carName} />
        </div>
      )}

      <div className="text-center py-4">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Car className="w-12 h-12 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{rentalInfo.carName}</h3>
        <p className="text-muted-foreground mb-6">{t("rental.nearCar")}</p>
        <p className="text-xs text-muted-foreground mb-4">
          {t("rental.autoUnlock", { meters: AUTO_UNLOCK_DISTANCE_METERS })}
        </p>

        <Button 
          size="lg" 
          className="w-full max-w-xs gap-2"
          onClick={handleUnlockCar}
          disabled={unlocking}
        >
          {unlocking ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t("rental.unlocking")}
            </>
          ) : carUnlocked ? (
            <>
              <CheckCircle className="w-5 h-5" />
              {t("rental.doorsOpen")}
            </>
          ) : (
            <>
              <Unlock className="w-5 h-5" />
              {t("rental.unlockDoors")}
            </>
          )}
        </Button>
      </div>

      <Button 
        className="w-full mt-4" 
        onClick={() => setStep(2)}
        disabled={!carUnlocked}
      >
        {carUnlocked ? t("common.continue") : t("rental.unlockFirst")} <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </Card>
  );

  const renderPhotoStep = () => (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Camera className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t("rental.step2Title")}</h2>
          <p className="text-sm text-muted-foreground">{t("rental.step2Desc")}</p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-green-500/10 rounded-lg mb-6">
        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
        <div>
          <p className="font-medium text-green-700 dark:text-green-400">{t("rental.unlockedBanner")}</p>
          <p className="text-sm text-muted-foreground">{t("rental.unlockedBannerDesc")}</p>
        </div>
      </div>

      <VehiclePhotoCapture
        onPhotosChange={setBeforePhotos}
        photos={beforePhotos}
        maxPhotos={4}
      />

      <div className="mt-6 space-y-4">
        <div>
          <Label htmlFor="damageNotes">{t("rental.damageNotes")}</Label>
          <Textarea
            id="damageNotes"
            placeholder={t("rental.damagePlaceholder")}
            value={damageNotes}
            onChange={(e) => setDamageNotes(e.target.value)}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="carLocation">{t("rental.carLocation")}</Label>
          <div className="flex gap-2 mt-2">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="carLocation"
                type="text"
                placeholder={t("rental.carLocationPlaceholder")}
                value={carLocation}
                onChange={(e) => setCarLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
              />
            </div>
          </div>
        </div>
      </div>

      <Button 
        className="w-full mt-6" 
        onClick={() => setStep(3)}
        disabled={beforePhotos.length === 0}
      >
        {t("common.continue")} <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </Card>
  );

  const renderStartStep = () => (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Key className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t("rental.step3Title")}</h2>
          <p className="text-sm text-muted-foreground">{t("rental.step3Desc")}</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <Unlock className="w-5 h-5 text-green-500 mt-0.5" />
          <div>
            <p className="font-medium">{t("rental.doorsUnlockedCheck")}</p>
            <p className="text-sm text-muted-foreground">{t("rental.doorsUnlockedCheckDesc")}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
          <div>
            <p className="font-medium">{t("rental.photosTaken")}</p>
            <p className="text-sm text-muted-foreground">{t("rental.photosCount", { count: beforePhotos.length })}</p>
          </div>
        </div>

        {damageNotes && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium">{t("rental.damageNoteAdded")}</p>
              <p className="text-sm text-muted-foreground">{damageNotes}</p>
            </div>
          </div>
        )}

        {carLocation && (
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <MapPin className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">{t("rental.locationSaved")}</p>
              <p className="text-sm text-muted-foreground">{carLocation}</p>
            </div>
          </div>
        )}
      </div>

      <Button 
        size="lg"
        className="w-full gap-2 bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] shadow-[0_12px_30px_-10px_hsl(var(--primary)/0.55)] hover:opacity-95"
        onClick={handleStartRental}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {t("rental.starting")}
          </>
        ) : (
          <>
            <Car className="w-5 h-5" />
            {t("rental.startRental")}
          </>
        )}
      </Button>
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
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-background rounded-lg border border-border">
            <p className="text-muted-foreground">{t("rental.elapsedTime")}</p>
            <p className="text-lg font-semibold">{elapsedMinutes} {t("rental.minutes")}</p>
          </div>
          <div className="p-3 bg-background rounded-lg border border-border">
            <p className="text-muted-foreground">{t("rental.totalDistance")}</p>
            <p className="text-lg font-semibold">{distanceKm.toFixed(2)} {t("rental.km")}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">{t("rental.liveLocation")}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bell className="w-4 h-4" />
            <span>{t("rental.locationUpdates")}</span>
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

          <div className="p-4 bg-amber-500/10 rounded-lg">
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
                : step === 1
                  ? t("rental.titleUnlock")
                  : t("rental.titleStart")}
          </h1>
          <p className="text-muted-foreground mb-8">{rentalInfo.carName}</p>

          {/* Progress Steps */}
          {!rentalStarted && !rentalEnded && (
            <div className="flex items-center justify-between mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`w-16 h-1 mx-2 ${step > s ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {rentalEnded ? renderCompleted() : rentalStarted ? renderActiveRental() : (
            <>
              {step === 1 && renderUnlockStep()}
              {step === 2 && renderPhotoStep()}
              {step === 3 && renderStartStep()}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StartRental;



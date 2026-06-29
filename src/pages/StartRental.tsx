import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { usePushNotifications } from "@/hooks/usePushNotifications";
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

const StartRental = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { sendRentalNotification, permission: notifPermission, requestPermission: requestNotifPermission } = usePushNotifications();
  const state = location.state as RentalState | null;

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
    if (!state?.carId) return;

    const fetchCarGPS = async () => {
      const { data } = await supabase
        .from("cars")
        .select("latitude, longitude")
        .eq("id", state.carId)
        .maybeSingle();

      if (data?.latitude && data?.longitude) {
        setCarGPSData({ latitude: data.latitude, longitude: data.longitude });
      }
    };

    fetchCarGPS();

    // Real-time GPS updates
    const channel = supabase
      .channel(`rental-gps-${state.carId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "cars",
          filter: `id=eq.${state.carId}`,
        },
        (payload) => {
          const newData = payload.new as { latitude?: number | null; longitude?: number | null };
          if (newData.latitude && newData.longitude) {
            setCarGPSData({ latitude: newData.latitude, longitude: newData.longitude });
            // Konum güncelleme bildirimi gönder
            if (rentalStarted) {
              sendRentalNotification("location", state.carName, "Araç konumu güncellendi");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state?.carId, rentalStarted, sendRentalNotification, state?.carName]);

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
    if (step < 2) return;

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
    const validateBooking = async () => {
      if (!state?.bookingId || !user) {
        setBookingValidationLoading(false);
        setBookingValidated(false);
        return;
      }

      setBookingValidationLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("id, user_id, payment_status")
        .eq("id", state.bookingId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        toast.error("Kiralama kaydı doğrulanamadı.");
        setBookingValidated(false);
        setBookingValidationLoading(false);
        navigate("/cars");
        return;
      }

      if (!isBookingPaid(data.payment_status)) {
        toast.error("Kiralama başlatmak için ödeme tamamlanmalı.");
        setBookingValidated(false);
        setBookingValidationLoading(false);
        navigate("/payment", { state });
        return;
      }

      setBookingValidated(true);
      setBookingValidationLoading(false);
    };

    void validateBooking();
  }, [navigate, state, user]);

  if (!state) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg text-center">
            <Card className="p-8">
              <h1 className="text-2xl font-bold text-foreground mb-4">Kiralama Bilgisi Bulunamadı</h1>
              <p className="text-muted-foreground mb-6">
                Kiralama başlatmak için önce ödeme yapmanız gerekmektedir.
              </p>
              <Button onClick={() => navigate("/cars")}>Araçlara Git</Button>
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
              <h1 className="text-2xl font-bold text-foreground mb-4">Giriş Gerekli</h1>
              <p className="text-muted-foreground mb-6">Kiralama başlatmak için önce giriş yapın.</p>
              <Button onClick={() => navigate("/auth")}>Giriş Yap</Button>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (bookingValidationLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg text-center">
            <Card className="p-8">
              <h1 className="text-xl font-semibold text-foreground mb-4">Kiralama Kontrol Ediliyor</h1>
              <p className="text-muted-foreground">Rezervasyon ve ödeme bilgileri doğrulanıyor...</p>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleUnlockCar = async () => {
    if (!user) return;
    setUnlocking(true);

    try {
      const { data, error } = await supabase.functions.invoke('vehicle-control', {
        body: {
          action: 'unlock',
          carId: state.carId,
          bookingId: state.bookingId,
          userId: user.id,
          latitude: userLocation?.lat,
          longitude: userLocation?.lng,
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        setCarUnlocked(true);
      } else {
        throw new Error(data.error);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Araç açılamadı";
      toast.error(message);
    } finally {
      setUnlocking(false);
    }
  };

  const handleLockCar = async () => {
    if (!user) return;
    setLocking(true);

    try {
      const { data, error } = await supabase.functions.invoke('vehicle-control', {
        body: {
          action: 'lock',
          carId: state.carId,
          bookingId: state.bookingId,
          userId: user.id,
          latitude: userLocation?.lat,
          longitude: userLocation?.lng,
        }
      });

      if (error) throw error;

      const response = (data ?? {}) as VehicleControlResponse;
      if (response.success) {
        toast.success(response.message ?? "Araç kilitlendi.");
      } else {
        throw new Error(response.error ?? "Araç kilitlenemedi");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Araç kilitlenemedi";
      toast.error(message);
    } finally {
      setLocking(false);
    }
  };

  const handleStartRental = async () => {
    if (!bookingValidated) {
      toast.error("Rezervasyon doğrulanamadı. Tekrar deneyin.");
      return;
    }

    if (!carUnlocked) {
      toast.error("Kiralamayı başlatmadan önce aracın kilidini açın.");
      return;
    }

    if (!user || beforePhotos.length === 0) {
      toast.error("Lütfen önce araç fotoğrafı çekin");
      return;
    }

    setLoading(true);

    try {
      // Fotoğrafları kaydet
      for (const photo of beforePhotos) {
        await supabase.from('vehicle_photos').insert({
          booking_id: state.bookingId,
          car_id: state.carId,
          user_id: user.id,
          photo_type: 'before_rental',
          photo_url: photo,
          notes: damageNotes || null,
        });
      }

      // Kiralamayı başlat
      const { data, error } = await supabase.functions.invoke('vehicle-control', {
        body: {
          action: 'start_rental',
          carId: state.carId,
          bookingId: state.bookingId,
          userId: user.id,
          latitude: userLocation?.lat,
          longitude: userLocation?.lng,
          notes: `Konum: ${carLocation}`,
        }
      });

      if (error) throw error;

      const response = (data ?? {}) as VehicleControlResponse;
      if (response.success) {
        toast.success("Kiralama başarıyla başlatıldı!");
        sendRentalNotification("start", state.carName);
        setRentalStarted(true);
        const startTime = new Date();
        setRentalStartTime(startTime);
        if (carGPSData) {
          setLastGPSData(carGPSData);
        }
        setStep(4);
      } else {
        throw new Error(response.error ?? "Kiralama başlatılamadı");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Kiralama başlatılamadı";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEndRental = async () => {
    if (!user || afterPhotos.length === 0) {
      toast.error("Lütfen önce araç fotoğrafı çekin");
      return;
    }

    setLoading(true);

    try {
      // Fotoğrafları kaydet
      for (const photo of afterPhotos) {
        await supabase.from('vehicle_photos').insert({
          booking_id: state.bookingId,
          car_id: state.carId,
          user_id: user.id,
          photo_type: 'after_rental',
          photo_url: photo,
          notes: damageNotes || null,
        });
      }

      // Kiralamayı bitir
      const { data, error } = await supabase.functions.invoke('vehicle-control', {
        body: {
          action: 'end_rental',
          carId: state.carId,
          bookingId: state.bookingId,
          userId: user.id,
          latitude: userLocation?.lat,
          longitude: userLocation?.lng,
          notes: `Anahtar torpidoya bırakıldı. Konum: ${carLocation}`,
        }
      });

      if (error) throw error;

      const response = (data ?? {}) as VehicleControlResponse;
      if (response.success) {
        toast.success("Kiralama başarıyla bitirildi! Kapılar kilitlendi.");
        setRentalEnded(true);
      } else {
        throw new Error(response.error ?? "Kiralama bitirilemedi");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Kiralama bitirilemedi";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Camera className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Adım 1: Araç Fotoğrafları</h2>
          <p className="text-sm text-muted-foreground">Kiralama öncesi aracın durumunu belgeleyin</p>
        </div>
      </div>

      <VehiclePhotoCapture
        onPhotosChange={setBeforePhotos}
        photos={beforePhotos}
        maxPhotos={4}
      />

      <div className="mt-6 space-y-4">
        <div>
          <Label htmlFor="damageNotes">Hasar Notları (varsa)</Label>
          <Textarea
            id="damageNotes"
            placeholder="Araçta gördüğünüz hasarları buraya yazın..."
            value={damageNotes}
            onChange={(e) => setDamageNotes(e.target.value)}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="carLocation">Aracın Konumu</Label>
          <div className="flex gap-2 mt-2">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="carLocation"
                type="text"
                placeholder="Örn: AVM B2 katı, 45 numaralı park yeri"
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
        onClick={() => setStep(2)}
        disabled={beforePhotos.length === 0}
      >
        Devam Et <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </Card>
  );

  const renderStep2 = () => (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Unlock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Adım 2: Aracı Açın</h2>
          <p className="text-sm text-muted-foreground">Uzaktan kapı açma</p>
        </div>
      </div>

      <div className="text-center py-8">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Car className="w-12 h-12 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{state.carName}</h3>
        <p className="text-muted-foreground mb-6">Aracın yanında olduğunuzdan emin olun</p>
        <p className="text-xs text-muted-foreground mb-4">
          Otomatik acma aktif: Araca {AUTO_UNLOCK_DISTANCE_METERS}m yaklastiginizda kilit acma denemesi yapilir.
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
              Açılıyor...
            </>
          ) : (
            <>
              <Unlock className="w-5 h-5" />
              Kapıları Aç
            </>
          )}
        </Button>
      </div>

      <Button 
        className="w-full mt-4" 
        onClick={() => setStep(3)}
        disabled={!carUnlocked}
      >
        {carUnlocked ? "Devam Et" : "Önce Aracı Aç"} <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </Card>
  );

  const renderStep3 = () => (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Key className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Adım 3: Kiralamayı Başlatın</h2>
          <p className="text-sm text-muted-foreground">Son kontrolleri yapın</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
          <div>
            <p className="font-medium">Fotoğraflar çekildi</p>
            <p className="text-sm text-muted-foreground">{beforePhotos.length} fotoğraf yüklendi</p>
          </div>
        </div>

        {damageNotes && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium">Hasar notu eklendi</p>
              <p className="text-sm text-muted-foreground">{damageNotes}</p>
            </div>
          </div>
        )}

        {carLocation && (
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <MapPin className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Konum kaydedildi</p>
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
            Başlatılıyor...
          </>
        ) : (
          <>
            <Car className="w-5 h-5" />
            Kiralamayı Başlat
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
            <h2 className="text-lg font-semibold text-green-700 dark:text-green-400">Kiralama Aktif</h2>
            <p className="text-sm text-muted-foreground">{state.carName}</p>
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
            Kapıları Aç
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleLockCar}
            disabled={locking}
          >
            {locking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Kapıları Kilitle
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-background rounded-lg border border-border">
            <p className="text-muted-foreground">Geçen Süre</p>
            <p className="text-lg font-semibold">{elapsedMinutes} dk</p>
          </div>
          <div className="p-3 bg-background rounded-lg border border-border">
            <p className="text-muted-foreground">Toplam Mesafe</p>
            <p className="text-lg font-semibold">{distanceKm.toFixed(2)} km</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Canlı Araç Konumu</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bell className="w-4 h-4" />
            <span>Güncellendikçe yenilenir</span>
          </div>
        </div>

        {carGPSData ? (
          <CarLocationMap latitude={carGPSData.latitude} longitude={carGPSData.longitude} carName={state.carName} />
        ) : (
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
            <div className="text-muted-foreground">GPS verisi bekleniyor...</div>
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
            <h2 className="text-lg font-semibold">Kiralamayı Bitir</h2>
            <p className="text-sm text-muted-foreground">Araç teslim fotoğrafları çekin</p>
          </div>
        </div>

        <VehiclePhotoCapture onPhotosChange={setAfterPhotos} photos={afterPhotos} maxPhotos={4} />

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="endDamageNotes">Hasar Notları (varsa)</Label>
            <Textarea
              id="endDamageNotes"
              placeholder="Araçta yeni bir hasar varsa buraya yazın..."
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              className="mt-2"
            />
          </div>

          <div className="p-4 bg-amber-500/10 rounded-lg">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">Anahtarı Torpidoya Bırakın</p>
                <p className="text-sm text-muted-foreground">
                  Kiralamayı bitirmeden önce anahtar torpido gözüne bırakıldığından emin olun.
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
              Bitirilyor...
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              Kiralamayı Bitir ve Kapıları Kilitle
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
      <h1 className="text-2xl font-bold text-foreground mb-2">Kiralama Tamamlandı!</h1>
      <p className="text-muted-foreground mb-6">
        {state.carName} için kiralama başarıyla bitirildi. Araç kapıları kilitlendi.
      </p>
      <Button onClick={() => navigate("/my-bookings")}>
        Rezervasyonlarıma Git
      </Button>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-lg">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {rentalEnded ? "Kiralama Tamamlandı" : rentalStarted ? "Aktif Kiralama" : "Kiralamayı Başlat"}
          </h1>
          <p className="text-muted-foreground mb-8">{state.carName}</p>

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
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StartRental;



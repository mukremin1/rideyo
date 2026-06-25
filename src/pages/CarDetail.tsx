import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { MapPin, Users, Fuel, Settings, Shield, Clock, ArrowLeft, Star, Lock, Unlock, Navigation, Calendar, TrendingUp, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import InsurancePackages from "@/components/InsurancePackages";
import CarLocationMap from "@/components/CarLocationMap";
import { checkRentalEligibility } from "@/lib/rentalEligibility";
import { fetchActiveCampaignForCarType, type ActiveCampaign } from "@/lib/campaigns";
import { computeRentalPricing, ADDITIONAL_DRIVER_DAILY_FEE } from "@/lib/rentalPricing";
import { createBookingRecord } from "@/lib/bookings";
import { Checkbox } from "@/components/ui/checkbox";
import carCompact from "@/assets/car-compact.jpg";
import carSedan from "@/assets/car-sedan.jpg";
import carSuv from "@/assets/car-suv.jpg";

interface Car {
  id: string;
  name: string;
  type: string;
  price_per_minute: number;
  price_per_hour: number;
  price_per_day: number;
  price_per_km: number;
  km_packages: Record<string, number>;
  image_url: string | null;
  fuel_type: string;
  transmission: string;
  seats: number;
  available: boolean;
  location: string;
  plate_number: string | null;
  year: number | null;
  description: string | null;
  lock_status: string | null;
  latitude: number | null;
  longitude: number | null;
}
interface SubscriptionInfo {
  tier: string;
  discount_percentage: number;
}
interface ServiceZone {
  id: string;
  name: string | null;
  city: string | null;
}

const CarDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPricing, setSelectedPricing] = useState<"minute" | "hour" | "day" | null>(null);
  const [selectedKmPackage, setSelectedKmPackage] = useState<string | null>(null);
  const [selectedInsurance, setSelectedInsurance] = useState<string | null>(null);
  const [insurancePrice, setInsurancePrice] = useState(0);
  const [lockStatus, setLockStatus] = useState<string>("locked");
  const [isProcessing, setIsProcessing] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [trafficDelayMinutes, setTrafficDelayMinutes] = useState(10);
  const [rentalDays, setRentalDays] = useState(1);
  const [rentalHours, setRentalHours] = useState(0.5);
  const [serviceZones, setServiceZones] = useState<ServiceZone[]>([]);
  const [pickupZoneId, setPickupZoneId] = useState<string>("");
  const [dropoffZoneId, setDropoffZoneId] = useState<string>("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [campaign, setCampaign] = useState<ActiveCampaign | null>(null);
  const [additionalDriverEnabled, setAdditionalDriverEnabled] = useState(false);
  const [additionalDriverName, setAdditionalDriverName] = useState("");
  const [additionalDriverLicense, setAdditionalDriverLicense] = useState("");
  const KM_PRICE_PER_UNIT = 15;
  const kmPackages = [
    { id: "100", label: "100 KM", price: 1000 },
    { id: "200", label: "200 KM", price: 2000 },
    { id: "none", label: `Paketsiz devam et (${KM_PRICE_PER_UNIT} TL/km)`, price: 0 },
  ];
  const selectedKmPackageData = kmPackages.find((pkg) => pkg.id === selectedKmPackage) || null;
  const kmPackagePrice = selectedKmPackageData?.price ?? 0;

  const normalizeText = (value: string) => value.toLocaleLowerCase("tr");

  const handleInsuranceSelect = (packageId: string, price: number) => {
    setSelectedInsurance(packageId);
    setInsurancePrice(price);
  };


  const handleLockToggle = async () => {
    if (!user || !car) return;
    
    setIsProcessing(true);
    const newStatus = lockStatus === "locked" ? "unlocked" : "locked";
    
    try {
      // Update car lock status
      const { error: updateError } = await supabase
        .from("cars")
        .update({ lock_status: newStatus })
        .eq("id", car.id);

      if (updateError) throw updateError;

      // Log the action
      const { error: logError } = await supabase
        .from("vehicle_actions")
        .insert({
          car_id: car.id,
          user_id: user.id,
          action_type: newStatus === "locked" ? "lock" : "unlock",
          latitude: car.latitude,
          longitude: car.longitude,
        });

      if (logError) throw logError;

      setLockStatus(newStatus);
      toast({
        title: newStatus === "locked" ? "Araç Kilitlendi" : "Araç Kilidi Açıldı",
        description: `${car.name} ${newStatus === "locked" ? "kilitlendi" : "kilidi açıldı"}`,
      });
    } catch (error) {
      console.error("Kilit işlemi hatası:", error);
      toast({
        title: "Hata",
        description: "Kilit işlemi yapılamadı",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLocationCheck = async () => {
    if (!user || !car) return;

    try {
      // Log location check action
      const { error } = await supabase
        .from("vehicle_actions")
        .insert({
          car_id: car.id,
          user_id: user.id,
          action_type: "location_check",
          latitude: car.latitude,
          longitude: car.longitude,
        });

      if (error) throw error;

      toast({
        title: "Konum Güncellendi",
        description: "Araç konumu kontrol edildi",
      });
    } catch (error) {
      console.error("Konum kontrolü hatası:", error);
    }
  };

  useEffect(() => {
    fetchCar();
    fetchServiceZones();
    if (user) {
      fetchUserSubscription();
    }
  }, [id, user]);

  useEffect(() => {
    if (!car || serviceZones.length === 0) return;

    const locationText = (car.location || "").trim();
    if (locationText) {
      if (!pickupAddress) setPickupAddress(locationText);
      if (!dropoffAddress) setDropoffAddress(locationText);
    }

    if (!pickupZoneId || !dropoffZoneId) {
      const match = serviceZones.find((zone) => {
        const zoneKey = (zone.city || zone.name || "").trim();
        if (!zoneKey || !locationText) return false;
        return normalizeText(locationText).includes(normalizeText(zoneKey));
      });

      if (match) {
        if (!pickupZoneId) setPickupZoneId(match.id);
        if (!dropoffZoneId) setDropoffZoneId(match.id);
        return;
      }

    }
  }, [car, serviceZones, pickupAddress, dropoffAddress, pickupZoneId, dropoffZoneId]);

  const fetchServiceZones = async () => {
    try {
      const { data, error } = await supabase
        .from("service_zones")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setServiceZones(data || []);
    } catch (error) {
      console.error("Hizmet bölgeleri yüklenirken hata:", error);
    }
  };

  const fetchUserSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .gt('end_date', new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchCar = async () => {
    try {
      const { data, error } = await supabase
        .from("cars")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Araç yüklenirken hata:", error);
        toast({
          title: "Hata",
          description: "Araç yüklenemedi",
          variant: "destructive",
        });
        return;
      }

      setCar(data as Car);
      if (data?.lock_status) {
        setLockStatus(data.lock_status);
      }
      if (data?.type) {
        const activeCampaign = await fetchActiveCampaignForCarType(data.type);
        setCampaign(activeCampaign);
      }
    } catch (error) {
      console.error("Araç yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 text-center">
          <p className="text-xl text-muted-foreground">Yükleniyor...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!car) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Araç Bulunamadı</h1>
            <p className="text-muted-foreground mb-8">Aradığınız araç mevcut değil.</p>
            <Link to="/cars">
              <Button>Araçlara Dön</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleReserve = async () => {
    if (!user) {
      toast({
        title: "Giriş Gerekli",
        description: "Araç kiralamak için giriş yapmalısınız",
      });
      navigate("/auth");
      return;
    }

    const eligibility = await checkRentalEligibility(user.id, user.user_metadata);
    if (!eligibility.eligible) {
      toast({
        title: "Doğrulama Gerekli",
        description: eligibility.reason,
        variant: "destructive",
      });
      if (eligibility.redirectTo) {
        navigate(eligibility.redirectTo);
      }
      return;
    }

    if (!selectedPricing) {
      toast({
        title: "Fiyat Seçimi Gerekli",
        description: "Lütfen bir fiyatlandırma seçeneği seçin",
        variant: "destructive",
      });
      return;
    }

    if (selectedPricing === "day" && (!pickupAddress.trim() || !dropoffAddress.trim())) {
      toast({
        title: "Eksik Bilgi",
        description: "Lütfen alış ve bırakış konumunu kontrol edin",
        variant: "destructive",
      });
      return;
    }

    if (selectedPricing === "day" && !selectedInsurance) {
      toast({
        title: "Sigorta Seçimi Gerekli",
        description: "Günlük kiralama için sigorta paketi seçimi zorunludur",
        variant: "destructive",
      });
      return;
    }

    if (selectedPricing === "day" && additionalDriverEnabled) {
      if (!additionalDriverName.trim() || !additionalDriverLicense.trim()) {
        toast({
          title: "Ek Sürücü Bilgisi Eksik",
          description: "Ek sürücü adı ve ehliyet numarasını girin.",
          variant: "destructive",
        });
        return;
      }
    }

    const startTime = new Date();
    const endTime = new Date();
    const simulatedTrafficDelay = Math.floor(Math.random() * 11);
    setTrafficDelayMinutes(simulatedTrafficDelay);

    if (selectedPricing === "hour") {
      endTime.setHours(endTime.getHours() + rentalHours);
    } else if (selectedPricing === "day") {
      endTime.setDate(endTime.getDate() + rentalDays);
    } else {
      endTime.setMinutes(endTime.getMinutes() + 30);
    }

    const pricing = computeRentalPricing({
      rentalType: selectedPricing,
      pricePerMinute: car.price_per_minute,
      pricePerHour: car.price_per_hour,
      pricePerDay: car.price_per_day,
      rentalHours,
      rentalDays,
      insurancePrice,
      kmPackagePrice,
      pickupZoneId,
      dropoffZoneId,
      subscriptionDiscountPercent: subscription?.discount_percentage,
      campaignDiscountPercent: campaign?.discount_percentage,
      additionalDriverEnabled: selectedPricing === "day" && additionalDriverEnabled,
      additionalDriverDays: rentalDays,
    });

    try {
      const { data: bookingData, error: bookingError } = await createBookingRecord({
        car_id: car.id,
        user_id: user.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        total_price: pricing.totalPrice,
        rental_type: selectedPricing,
        driver_history_checked: true,
        driver_risk_level: "low",
        traffic_delay_minutes: simulatedTrafficDelay,
        pickup_zone_id: selectedPricing === "day" ? (pickupZoneId || null) : null,
        dropoff_zone_id: selectedPricing === "day" ? (dropoffZoneId || null) : null,
        pickup_address: selectedPricing === "day" ? (pickupAddress || null) : null,
        dropoff_address: selectedPricing === "day" ? (dropoffAddress || null) : null,
        different_zone_fee: pricing.zoneFee,
        payment_status: "pending",
        additional_driver_enabled: selectedPricing === "day" && additionalDriverEnabled,
        additional_driver_name:
          selectedPricing === "day" && additionalDriverEnabled
            ? additionalDriverName.trim()
            : null,
        additional_driver_license:
          selectedPricing === "day" && additionalDriverEnabled
            ? additionalDriverLicense.trim().toUpperCase()
            : null,
        additional_driver_fee: pricing.additionalDriverFee,
      });

      if (bookingError || !bookingData) throw new Error(bookingError ?? "Rezervasyon oluşturulamadı.");

      navigate("/payment", {
        state: {
          bookingId: bookingData.id,
          carId: car.id,
          carName: car.name,
          totalPrice: pricing.totalPrice,
          rentalType: selectedPricing,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          rentalAmount: pricing.rentalBase,
          kmPackageLabel: selectedKmPackageData?.label,
          kmPackagePrice: selectedKmPackageData ? kmPackagePrice : undefined,
          insurancePrice: selectedInsurance ? insurancePrice : undefined,
          provisionFee: pricing.provisionFee,
          zoneFee: pricing.zoneFee,
          campaignDiscount: pricing.campaignDiscount,
          subscriptionDiscount: pricing.subscriptionDiscount,
          additionalDriverFee: pricing.additionalDriverFee,
          additionalDriverName:
            selectedPricing === "day" && additionalDriverEnabled
              ? additionalDriverName.trim()
              : undefined,
        }
      });
    } catch (error: unknown) {
      console.error("Rezervasyon hatası:", error);
      const message = error instanceof Error ? error.message : "Bir hata oluştu";
      toast({
        title: "Rezervasyon Hatası",
        description: message,
        variant: "destructive",
      });
    }
  };

  const pricingBreakdown = selectedPricing
    ? computeRentalPricing({
        rentalType: selectedPricing,
        pricePerMinute: car.price_per_minute,
        pricePerHour: car.price_per_hour,
        pricePerDay: car.price_per_day,
        rentalHours,
        rentalDays,
        insurancePrice,
        kmPackagePrice,
        pickupZoneId,
        dropoffZoneId,
        subscriptionDiscountPercent: subscription?.discount_percentage,
        campaignDiscountPercent: campaign?.discount_percentage,
        additionalDriverEnabled: selectedPricing === "day" && additionalDriverEnabled,
        additionalDriverDays: rentalDays,
      })
    : null;

  // Get appropriate image based on car type
  let carImage = carCompact;
  if (car.type === "sedan") carImage = carSedan;
  if (car.type === "suv") carImage = carSuv;
  const displayImage = car.image_url || carImage;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <Link to="/cars" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Araçlara Dön
          </Link>

          {subscription && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                🎉 {subscription.tier.toUpperCase()} üyesi olarak %{subscription.discount_percentage} indirim kazanıyorsunuz!
              </p>
            </div>
          )}

          {campaign && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                🏷️ {campaign.name} — %{campaign.discount_percentage} kampanya indirimi uygulanacak
              </p>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6 mb-12">
            <div>
              <div className="relative rounded-2xl overflow-hidden mb-6">
                <img 
                  src={displayImage} 
                  alt={car.name}
                  className="w-full h-96 object-cover"
                />
                {car.available ? (
                  <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground text-lg px-4 py-2">
                    Müsait
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="absolute top-4 right-4 text-lg px-4 py-2">
                    Kullanımda
                  </Badge>
                )}
              </div>

              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="font-semibold text-foreground mb-4 text-lg">Araç Özellikleri</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Kapasite</div>
                      <div className="font-semibold text-foreground">{car.seats} Kişi</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Fuel className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Yakıt</div>
                      <div className="font-semibold text-foreground">{car.fuel_type}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Settings className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Vites</div>
                      <div className="font-semibold text-foreground">{car.transmission}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Sigorta</div>
                      <div className="font-semibold text-foreground">Tam Kasko</div>
                    </div>
                  </div>
                </div>

                {car.description && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="font-semibold text-foreground mb-2">Açıklama</h4>
                    <p className="text-muted-foreground">{car.description}</p>
                  </div>
                )}
              </div>

              {car.latitude && car.longitude && (
                <div className="mt-6">
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-foreground text-lg">Araç Konumu</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLocationCheck}
                        className="gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        Konumu Güncelle
                      </Button>
                    </div>
                    <CarLocationMap
                      latitude={Number(car.latitude)}
                      longitude={Number(car.longitude)}
                      carName={car.name}
                    />
                    <div className="mt-4 flex gap-3">
                      <Button
                        variant={lockStatus === "locked" ? "default" : "outline"}
                        className="flex-1 gap-2"
                        onClick={handleLockToggle}
                        disabled={isProcessing || !user}
                      >
                        {lockStatus === "locked" ? (
                          <>
                            <Lock className="w-4 h-4" />
                            Kilitli
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4" />
                            Açık
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={handleLockToggle}
                        disabled={isProcessing || !user}
                      >
                        {lockStatus === "locked" ? (
                          <>
                            <Unlock className="w-4 h-4" />
                            Kilidi Aç
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            Kilitle
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="bg-card border border-border rounded-2xl p-8">
                <div className="mb-6">
                  <h1 className="text-4xl font-bold text-foreground mb-2">{car.name}</h1>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-5 h-5" />
                    <span className="text-lg">{car.location}</span>
                  </div>
                  {car.plate_number && (
                    <div className="text-sm text-muted-foreground mt-2">
                      Plaka: <span className="font-semibold">{car.plate_number}</span>
                    </div>
                  )}
                  {car.year && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Model Yılı: <span className="font-semibold">{car.year}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                    ))}
                    <span className="text-muted-foreground ml-2">(128 değerlendirme)</span>
                  </div>
                </div>

                <div className="border-t border-border pt-6 mb-6">
                  <h3 className="font-semibold text-foreground mb-4 text-lg">Kiralama Paketleri</h3>
                  
                  <Tabs defaultValue="minute" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="minute">Dakika</TabsTrigger>
                      <TabsTrigger value="day">Gün</TabsTrigger>
                    </TabsList>

                    <TabsContent value="minute" className="space-y-4 mt-4">
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Clock className="w-8 h-8 text-primary" />
                            <div>
                              <h4 className="font-bold text-xl">Dakikalık Kiralama</h4>
                              <p className="text-sm text-muted-foreground">Esnek kullanım</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-primary">{car.price_per_minute}₺</div>
                            <div className="text-xs text-muted-foreground">dakika başı</div>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">15 Dakika</span>
                            <span className="font-semibold">{(car.price_per_minute * 15).toFixed(2)}₺</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">30 Dakika</span>
                            <span className="font-semibold">{(car.price_per_minute * 30).toFixed(2)}₺</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">45 Dakika</span>
                            <span className="font-semibold">{(car.price_per_minute * 45).toFixed(2)}₺</span>
                          </div>
                        </div>
                        <Button
                          variant={selectedPricing === "minute" ? "default" : "outline"}
                          className="w-full mt-4"
                          onClick={() => setSelectedPricing("minute")}
                        >
                          {selectedPricing === "minute" ? "✓ Seçildi" : "Seç"}
                        </Button>
                      </div>
                      <div className="bg-background border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">Saatlik Kiralama</h4>
                            <p className="text-sm text-muted-foreground">Dakikalık altından saat seçimi</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{car.price_per_hour}₺</div>
                            <div className="text-xs text-muted-foreground">saat başı</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[0.5, 1, 2, 3, 4, 6, 8, 10, 12].map((hour) => (
                            <Button
                              key={hour}
                              type="button"
                              variant={selectedPricing === "hour" && rentalHours === hour ? "default" : "outline"}
                              onClick={() => {
                                setRentalHours(hour);
                                setSelectedPricing("hour");
                              }}
                            >
                              {hour === 0.5 ? "30 dk" : `${hour} Saat`}
                            </Button>
                          ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                          <span>Toplam</span>
                          <span className="font-semibold text-foreground">
                            {(car.price_per_hour * rentalHours).toFixed(2)}₺
                          </span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                          <Badge variant="secondary">KM</Badge>
                          Paketleri
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">Paketsiz kullanım: {KM_PRICE_PER_UNIT}₺/km</p>
                        <div className="grid grid-cols-2 gap-3">
                          {kmPackages.map((pkg) => (
                            <button
                              type="button"
                              key={pkg.id}
                              className={`border rounded-xl p-4 text-left transition-all ${
                                selectedKmPackage === pkg.id
                                  ? "border-primary bg-primary/5 shadow-md"
                                  : "border-border hover:border-primary/50"
                              }`}
                              onClick={() => setSelectedKmPackage(selectedKmPackage === pkg.id ? null : pkg.id)}
                            >
                              <div className="text-xl font-bold text-foreground">{pkg.label}</div>
                              <div className="text-lg font-semibold text-primary">
                                {pkg.price > 0 ? `${pkg.price}₺` : "Seç"}
                              </div>
                              {selectedKmPackage === pkg.id && (
                                <div className="mt-2 text-xs font-semibold text-primary">✓ Seçildi</div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </TabsContent>


                    <TabsContent value="day" className="space-y-4 mt-4">
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-8 h-8 text-primary" />
                            <div>
                              <h4 className="font-bold text-xl">Günlük Kiralama</h4>
                              <p className="text-sm text-muted-foreground">En ekonomik</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-primary">{car.price_per_day}₺</div>
                            <div className="text-xs text-muted-foreground">günlük</div>
                          </div>
                        </div>
                        
                        <div className="mb-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-foreground">Gün Sayısı</label>
                            <div className="text-2xl font-bold text-primary">{rentalDays} Gün</div>
                          </div>
                          <Slider
                            value={[rentalDays]}
                            onValueChange={(value) => setRentalDays(value[0])}
                            min={1}
                            max={30}
                            step={1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>1 gün</span>
                            <span>30 gün</span>
                          </div>
                        </div>

                        <div className="bg-background border border-border rounded-lg p-4 mb-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-sm text-muted-foreground">Toplam Tutar</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {rentalDays} gün × {car.price_per_day}₺
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">
                                {(car.price_per_day * rentalDays).toFixed(2)}₺
                              </div>
                              {subscription && (
                                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                  -%{subscription.discount_percentage} indirim uygulanacak
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant={selectedPricing === "day" ? "default" : "outline"}
                          className="w-full"
                          onClick={() => setSelectedPricing("day")}
                        >
                          {selectedPricing === "day" ? "✓ Seçildi" : "Seç"}
                        </Button>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                          <Badge variant="secondary">KM</Badge>
                          Paketleri
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">Paketsiz kullanım: {KM_PRICE_PER_UNIT}₺/km</p>
                        <div className="grid grid-cols-2 gap-3">
                          {kmPackages.map((pkg) => (
                            <button
                              type="button"
                              key={pkg.id}
                              className={`border rounded-xl p-4 text-left transition-all ${
                                selectedKmPackage === pkg.id
                                  ? "border-primary bg-primary/5 shadow-md"
                                  : "border-border hover:border-primary/50"
                              }`}
                              onClick={() => setSelectedKmPackage(selectedKmPackage === pkg.id ? null : pkg.id)}
                            >
                              <div className="text-xl font-bold text-foreground">{pkg.label}</div>
                              <div className="text-lg font-semibold text-primary">
                                {pkg.price > 0 ? `${pkg.price}₺` : "Seç"}
                              </div>
                              {selectedKmPackage === pkg.id && (
                                <div className="mt-2 text-xs font-semibold text-primary">✓ Seçildi</div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {selectedPricing === "day" && (
                  <div className="border-t border-border pt-6 mb-6">
                    <h3 className="font-semibold text-foreground mb-4 text-lg flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      Ek Sürücü
                    </h3>
                    <div className="rounded-xl border border-border p-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="additional-driver"
                          checked={additionalDriverEnabled}
                          onCheckedChange={(checked) => {
                            const enabled = checked === true;
                            setAdditionalDriverEnabled(enabled);
                            if (!enabled) {
                              setAdditionalDriverName("");
                              setAdditionalDriverLicense("");
                            }
                          }}
                        />
                        <div className="flex-1">
                          <label htmlFor="additional-driver" className="font-medium cursor-pointer">
                            Ek sürücü ekle
                          </label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Günlük {ADDITIONAL_DRIVER_DAILY_FEE} ₺ — {rentalDays} gün için{" "}
                            {(ADDITIONAL_DRIVER_DAILY_FEE * rentalDays).toLocaleString("tr-TR")} ₺
                          </p>
                        </div>
                      </div>
                      {additionalDriverEnabled && (
                        <div className="grid sm:grid-cols-2 gap-4 pt-2">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              Ad Soyad
                            </label>
                            <input
                              type="text"
                              placeholder="Ek sürücünün adı soyadı"
                              value={additionalDriverName}
                              onChange={(e) => setAdditionalDriverName(e.target.value)}
                              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              Ehliyet Numarası
                            </label>
                            <input
                              type="text"
                              placeholder="Ek sürücü ehliyet no"
                              value={additionalDriverLicense}
                              onChange={(e) => setAdditionalDriverLicense(e.target.value.toUpperCase())}
                              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedPricing === "day" && (
                  <div className="border-t border-border pt-6 mb-6">
                    <h3 className="font-semibold text-foreground mb-4 text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Alış ve Bırakış Noktası
                    </h3>
  
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Alış Noktası
                        </label>
                        <input
                          type="text"
                          placeholder="Aracın lokasyonu"
                          value={pickupAddress}
                          onChange={(e) => setPickupAddress(e.target.value)}
                          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                      </div>
  
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Bırakış Noktası
                        </label>
                        <input
                          type="text"
                          placeholder="Aracın lokasyonu"
                          value={dropoffAddress}
                          onChange={(e) => setDropoffAddress(e.target.value)}
                          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <InsurancePackages 
                  onSelect={handleInsuranceSelect}
                  selectedPackage={selectedInsurance}
                  rentalType={selectedPricing ?? undefined}
                />

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 mt-6">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Shield className="w-5 h-5" />
                    <span className="font-semibold">Güvenli Kiralama</span>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Kapsamlı sigorta seçenekleri</li>
                    <li>• Seçili planlarda yakıt desteği</li>
                    <li>• 7/24 yol yardım hizmeti</li>
                    <li>• Esnek iptal koşulları</li>
                  </ul>
                </div>

                {pricingBreakdown && (
                  <div className="bg-muted/40 border border-border rounded-xl p-4 mb-6 space-y-2 text-sm">
                    <p className="font-semibold text-foreground mb-2">Fiyat Özeti</p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kiralama bedeli</span>
                      <span>{pricingBreakdown.rentalBase.toFixed(2)} ₺</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Provizyon</span>
                      <span>{pricingBreakdown.provisionFee.toFixed(2)} ₺</span>
                    </div>
                    {pricingBreakdown.insurancePrice > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sigorta</span>
                        <span>{pricingBreakdown.insurancePrice.toFixed(2)} ₺</span>
                      </div>
                    )}
                    {pricingBreakdown.kmPackagePrice > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">KM paketi</span>
                        <span>{pricingBreakdown.kmPackagePrice.toFixed(2)} ₺</span>
                      </div>
                    )}
                    {pricingBreakdown.zoneFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Farklı bölge ücreti</span>
                        <span>{pricingBreakdown.zoneFee.toFixed(2)} ₺</span>
                      </div>
                    )}
                    {pricingBreakdown.additionalDriverFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Ek sürücü ({rentalDays} gün × {ADDITIONAL_DRIVER_DAILY_FEE} ₺)
                        </span>
                        <span>{pricingBreakdown.additionalDriverFee.toFixed(2)} ₺</span>
                      </div>
                    )}
                    {pricingBreakdown.subscriptionDiscount > 0 && (
                      <div className="flex justify-between text-amber-600">
                        <span>Abonelik indirimi</span>
                        <span>-{pricingBreakdown.subscriptionDiscount.toFixed(2)} ₺</span>
                      </div>
                    )}
                    {pricingBreakdown.campaignDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Kampanya indirimi</span>
                        <span>-{pricingBreakdown.campaignDiscount.toFixed(2)} ₺</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t font-bold text-base">
                      <span>Toplam</span>
                      <span className="text-primary">{pricingBreakdown.totalPrice.toFixed(2)} ₺</span>
                    </div>
                  </div>
                )}

                <Button 
                  size="lg"
                  className="w-full text-lg h-14 bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] shadow-[0_12px_30px_-10px_hsl(var(--primary)/0.55)] hover:opacity-95"
                  disabled={!car.available}
                  onClick={handleReserve}
                >
                  {!car.available 
                    ? "Şu An Müsait Değil" 
                    : "Rezervasyon Oluştur"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CarDetail;


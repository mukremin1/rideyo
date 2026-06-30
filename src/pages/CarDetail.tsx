import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();
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
    { id: "100", label: t("carDetail.kmPackage100"), price: 1000 },
    { id: "200", label: t("carDetail.kmPackage200"), price: 2000 },
    { id: "none", label: t("carDetail.kmPackageNone", { price: KM_PRICE_PER_UNIT }), price: 0 },
  ];
  const selectedKmPackageData = kmPackages.find((pkg) => pkg.id === selectedKmPackage) || null;
  const kmPackagePrice = selectedKmPackageData?.price ?? 0;

  useEffect(() => {
    const rental = searchParams.get("rental");
    if (rental === "minute" || rental === "hour" || rental === "day") {
      setSelectedPricing(rental);
    }
  }, [searchParams]);

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
        title: newStatus === "locked" ? t("carDetail.lockSuccessLocked") : t("carDetail.lockSuccessUnlocked"),
        description: newStatus === "locked"
          ? t("carDetail.lockDescLocked", { name: car.name })
          : t("carDetail.lockDescUnlocked", { name: car.name }),
      });
    } catch (error) {
      console.error("Kilit işlemi hatası:", error);
      toast({
        title: t("common.error"),
        description: t("carDetail.lockError"),
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
        title: t("carDetail.locationUpdated"),
        description: t("carDetail.locationChecked"),
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
          title: t("common.error"),
          description: t("carDetail.loadError"),
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
          <p className="text-xl text-muted-foreground">{t("common.loading")}</p>
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
            <h1 className="text-4xl font-bold text-foreground mb-4">{t("carDetail.notFoundTitle")}</h1>
            <p className="text-muted-foreground mb-8">{t("carDetail.notFoundDesc")}</p>
            <Link to="/cars">
              <Button>{t("carDetail.backToCars")}</Button>
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
        title: t("carDetail.loginRequired"),
        description: t("carDetail.loginRequiredDesc"),
      });
      navigate("/auth");
      return;
    }

    const eligibility = await checkRentalEligibility(user.id, user.user_metadata);
    if (!eligibility.eligible) {
      toast({
        title: t("carDetail.verificationRequired"),
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
        title: t("carDetail.pricingRequired"),
        description: t("carDetail.pricingRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    if (selectedPricing === "day" && (!pickupAddress.trim() || !dropoffAddress.trim())) {
      toast({
        title: t("carDetail.missingInfo"),
        description: t("carDetail.missingInfoDesc"),
        variant: "destructive",
      });
      return;
    }

    if (selectedPricing === "day" && !selectedInsurance) {
      toast({
        title: t("carDetail.insuranceRequired"),
        description: t("carDetail.insuranceRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    if (selectedPricing === "day" && additionalDriverEnabled) {
      if (!additionalDriverName.trim() || !additionalDriverLicense.trim()) {
        toast({
          title: t("carDetail.additionalDriverMissing"),
          description: t("carDetail.additionalDriverMissingDesc"),
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
        rental_amount: pricing.totalPrice - pricing.provisionFee,
        provision_fee: pricing.provisionFee,
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

      if (bookingError || !bookingData) throw new Error(bookingError ?? t("carDetail.reservationCreateFailed"));

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
      const message = error instanceof Error ? error.message : t("common.error");
      toast({
        title: t("carDetail.reservationError"),
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
            {t("carDetail.backToCars")}
          </Link>

          {subscription && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                🎉 {t("carDetail.subscriptionBanner", { tier: subscription.tier.toUpperCase(), percent: subscription.discount_percentage })}
              </p>
            </div>
          )}

          {campaign && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                🏷️ {t("carDetail.campaignBanner", { name: campaign.name, percent: campaign.discount_percentage })}
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
                    {t("carDetail.available")}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="absolute top-4 right-4 text-lg px-4 py-2">
                    {t("carDetail.inUse")}
                  </Badge>
                )}
              </div>

              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="font-semibold text-foreground mb-4 text-lg">{t("carDetail.featuresTitle")}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t("carDetail.capacity")}</div>
                      <div className="font-semibold text-foreground">{t("carDetail.seats", { count: car.seats })}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Fuel className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t("carDetail.fuel")}</div>
                      <div className="font-semibold text-foreground">{car.fuel_type}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Settings className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t("carDetail.transmission")}</div>
                      <div className="font-semibold text-foreground">{car.transmission}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t("carDetail.insuranceLabel")}</div>
                      <div className="font-semibold text-foreground">{t("carDetail.fullCoverage")}</div>
                    </div>
                  </div>
                </div>

                {car.description && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="font-semibold text-foreground mb-2">{t("carDetail.description")}</h4>
                    <p className="text-muted-foreground">{car.description}</p>
                  </div>
                )}
              </div>

              {car.latitude && car.longitude && (
                <div className="mt-6">
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-foreground text-lg">{t("carDetail.locationTitle")}</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLocationCheck}
                        className="gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        {t("carDetail.updateLocation")}
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
                            {t("carDetail.locked")}
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4" />
                            {t("carDetail.unlocked")}
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
                            {t("carDetail.unlock")}
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            {t("carDetail.lock")}
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
                      {t("carDetail.plate")}: <span className="font-semibold">{car.plate_number}</span>
                    </div>
                  )}
                  {car.year && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {t("carDetail.modelYear")}: <span className="font-semibold">{car.year}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                    ))}
                    <span className="text-muted-foreground ml-2">{t("carDetail.reviews", { count: 128 })}</span>
                  </div>
                </div>

                <div className="border-t border-border pt-6 mb-6">
                  <h3 className="font-semibold text-foreground mb-4 text-lg">{t("carDetail.packagesTitle")}</h3>
                  
                  <Tabs defaultValue="minute" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="minute">{t("carDetail.tabMinute")}</TabsTrigger>
                      <TabsTrigger value="day">{t("carDetail.tabDay")}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="minute" className="space-y-4 mt-4">
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Clock className="w-8 h-8 text-primary" />
                            <div>
                              <h4 className="font-bold text-xl">{t("carDetail.minuteRental")}</h4>
                              <p className="text-sm text-muted-foreground">{t("carDetail.flexibleUse")}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-primary">{car.price_per_minute}₺</div>
                            <div className="text-xs text-muted-foreground">{t("carDetail.perMinute")}</div>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("carDetail.minutes15")}</span>
                            <span className="font-semibold">{(car.price_per_minute * 15).toFixed(2)}₺</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("carDetail.minutes30")}</span>
                            <span className="font-semibold">{(car.price_per_minute * 30).toFixed(2)}₺</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("carDetail.minutes45")}</span>
                            <span className="font-semibold">{(car.price_per_minute * 45).toFixed(2)}₺</span>
                          </div>
                        </div>
                        <Button
                          variant={selectedPricing === "minute" ? "default" : "outline"}
                          className="w-full mt-4"
                          onClick={() => setSelectedPricing("minute")}
                        >
                          {selectedPricing === "minute" ? t("carDetail.selected") : t("carDetail.select")}
                        </Button>
                      </div>
                      <div className="bg-background border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">{t("carDetail.hourlyRental")}</h4>
                            <p className="text-sm text-muted-foreground">{t("carDetail.hourlyDesc")}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{car.price_per_hour}₺</div>
                            <div className="text-xs text-muted-foreground">{t("carDetail.perHour")}</div>
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
                              {hour === 0.5 ? t("carDetail.halfHour") : t("carDetail.hours", { count: hour })}
                            </Button>
                          ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                          <span>{t("carDetail.total")}</span>
                          <span className="font-semibold text-foreground">
                            {(car.price_per_hour * rentalHours).toFixed(2)}₺
                          </span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                          <Badge variant="secondary">{t("carDetail.kmBadge")}</Badge>
                          {t("carDetail.kmPackages")}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">{t("carDetail.kmNoPackage", { price: KM_PRICE_PER_UNIT })}</p>
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
                                {pkg.price > 0 ? `${pkg.price}₺` : t("carDetail.select")}
                              </div>
                              {selectedKmPackage === pkg.id && (
                                <div className="mt-2 text-xs font-semibold text-primary">{t("carDetail.selected")}</div>
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
                              <h4 className="font-bold text-xl">{t("carDetail.dailyRental")}</h4>
                              <p className="text-sm text-muted-foreground">{t("carDetail.mostEconomical")}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-primary">{car.price_per_day}₺</div>
                            <div className="text-xs text-muted-foreground">{t("carDetail.perDay")}</div>
                          </div>
                        </div>
                        
                        <div className="mb-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-foreground">{t("carDetail.dayCount")}</label>
                            <div className="text-2xl font-bold text-primary">{t("carDetail.days", { count: rentalDays })}</div>
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
                            <span>{t("carDetail.dayMin")}</span>
                            <span>{t("carDetail.dayMax")}</span>
                          </div>
                        </div>

                        <div className="bg-background border border-border rounded-lg p-4 mb-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-sm text-muted-foreground">{t("carDetail.totalAmount")}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {t("carDetail.daysMultiplier", { days: rentalDays, price: car.price_per_day })}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">
                                {(car.price_per_day * rentalDays).toFixed(2)}₺
                              </div>
                              {subscription && (
                                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                  {t("carDetail.discountApplied", { percent: subscription.discount_percentage })}
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
                          {selectedPricing === "day" ? t("carDetail.selected") : t("carDetail.select")}
                        </Button>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                          <Badge variant="secondary">{t("carDetail.kmBadge")}</Badge>
                          {t("carDetail.kmPackages")}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">{t("carDetail.kmNoPackage", { price: KM_PRICE_PER_UNIT })}</p>
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
                                {pkg.price > 0 ? `${pkg.price}₺` : t("carDetail.select")}
                              </div>
                              {selectedKmPackage === pkg.id && (
                                <div className="mt-2 text-xs font-semibold text-primary">{t("carDetail.selected")}</div>
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
                      {t("carDetail.additionalDriver")}
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
                            {t("carDetail.addAdditionalDriver")}
                          </label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t("carDetail.additionalDriverFee", {
                              fee: ADDITIONAL_DRIVER_DAILY_FEE,
                              days: rentalDays,
                              total: (ADDITIONAL_DRIVER_DAILY_FEE * rentalDays).toLocaleString(),
                            })}
                          </p>
                        </div>
                      </div>
                      {additionalDriverEnabled && (
                        <div className="grid sm:grid-cols-2 gap-4 pt-2">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              {t("carDetail.fullName")}
                            </label>
                            <input
                              type="text"
                              placeholder={t("carDetail.additionalDriverNamePlaceholder")}
                              value={additionalDriverName}
                              onChange={(e) => setAdditionalDriverName(e.target.value)}
                              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">
                              {t("carDetail.licenseNumber")}
                            </label>
                            <input
                              type="text"
                              placeholder={t("carDetail.additionalDriverLicensePlaceholder")}
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
                      {t("carDetail.pickupDropoff")}
                    </h3>
  
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          {t("carDetail.pickupPoint")}
                        </label>
                        <input
                          type="text"
                          placeholder={t("carDetail.locationPlaceholder")}
                          value={pickupAddress}
                          onChange={(e) => setPickupAddress(e.target.value)}
                          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                      </div>
  
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          {t("carDetail.dropoffPoint")}
                        </label>
                        <input
                          type="text"
                          placeholder={t("carDetail.locationPlaceholder")}
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
                    <span className="font-semibold">{t("carDetail.safeRental")}</span>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {(t("carDetail.safeRentalItems", { returnObjects: true }) as string[]).map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>

                {pricingBreakdown && (
                  <div className="bg-muted/40 border border-border rounded-xl p-4 mb-6 space-y-2 text-sm">
                    <p className="font-semibold text-foreground mb-2">{t("carDetail.priceSummary")}</p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("carDetail.rentalFee")}</span>
                      <span>{pricingBreakdown.rentalBase.toFixed(2)} ₺</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("carDetail.provision")}</span>
                      <span>{pricingBreakdown.provisionFee.toFixed(2)} ₺</span>
                    </div>
                    {pricingBreakdown.insurancePrice > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("carDetail.insuranceFee")}</span>
                        <span>{pricingBreakdown.insurancePrice.toFixed(2)} ₺</span>
                      </div>
                    )}
                    {pricingBreakdown.kmPackagePrice > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("carDetail.kmPackageFee")}</span>
                        <span>{pricingBreakdown.kmPackagePrice.toFixed(2)} ₺</span>
                      </div>
                    )}
                    {pricingBreakdown.zoneFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("carDetail.zoneFee")}</span>
                        <span>{pricingBreakdown.zoneFee.toFixed(2)} ₺</span>
                      </div>
                    )}
                    {pricingBreakdown.additionalDriverFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("carDetail.additionalDriverLine", { days: rentalDays, fee: ADDITIONAL_DRIVER_DAILY_FEE })}
                        </span>
                        <span>{pricingBreakdown.additionalDriverFee.toFixed(2)} ₺</span>
                      </div>
                    )}
                    {pricingBreakdown.subscriptionDiscount > 0 && (
                      <div className="flex justify-between text-amber-600">
                        <span>{t("carDetail.subscriptionDiscount")}</span>
                        <span>-{pricingBreakdown.subscriptionDiscount.toFixed(2)} ₺</span>
                      </div>
                    )}
                    {pricingBreakdown.campaignDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>{t("carDetail.campaignDiscount")}</span>
                        <span>-{pricingBreakdown.campaignDiscount.toFixed(2)} ₺</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t font-bold text-base">
                      <span>{t("carDetail.total")}</span>
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
                    ? t("carDetail.notAvailableNow") 
                    : t("carDetail.createReservation")}
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


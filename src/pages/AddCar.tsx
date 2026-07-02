import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useNavigate, Link } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";

import Navbar from "@/components/Navbar";

import Footer from "@/components/Footer";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { toast } from "sonner";

import { ArrowLeft, Car, CheckCircle2, MapPin, Fuel, Settings, CreditCard, Shield, Image } from "lucide-react";

import { z } from "zod";

import { Progress } from "@/components/ui/progress";

import CarImageUpload from "@/components/CarImageUpload";

import LocationPickerMap from "@/components/LocationPickerMap";
import {
  fetchAllowedRegions,
  getAllowedIlNames,
  validateLocationAgainstRegions,
  type AllowedRegion,
} from "@/lib/allowedRegions";



const turkeyCities = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin",
  "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur",
  "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan",
  "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Iğdır", "Isparta", "İstanbul",
  "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli",
  "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş",
  "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop",
  "Sivas", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak",
];



// Function to extract city from location text

const extractCityFromLocation = (location: string, otherLabel: string): string => {
  const lowerLocation = location.toLocaleLowerCase("tr");
  const match = turkeyCities.find((city) =>
    lowerLocation.includes(city.toLocaleLowerCase("tr"))
  );
  return match || otherLabel;
};

const AddCar = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isCarOwner, loading: rolesLoading } = useUserRoles();

  const carSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t("owner.addCar.validation.nameMin")).max(100),
        type: z.enum(["compact", "sedan", "suv"]),
        pricePerMinute: z.number().min(0.1, t("owner.addCar.validation.pricePositive")),
        pricePerHour: z.number().min(1, t("owner.addCar.validation.pricePositive")),
        pricePerDay: z.number().min(10, t("owner.addCar.validation.priceDayMin")),
        pricePerKm: z.number().min(0, t("owner.addCar.validation.priceKmMin")),
        fuelType: z.enum(["Benzin", "Dizel", "Elektrik", "Hibrit"]),
        transmission: z.enum(["Manuel", "Otomatik"]),
        seats: z.number().min(2).max(9),
        city: z.string().min(2, t("owner.addCar.validation.cityRequired")),
        location: z.string().min(3, t("owner.addCar.validation.locationMin")),
        plateNumber: z.string().optional(),
        year: z
          .number()
          .min(2010, t("owner.addCar.validation.yearMin"))
          .max(new Date().getFullYear() + 1),
        description: z.string().max(500, t("owner.addCar.validation.descriptionMax")).optional(),
        imageUrl: z.string().optional(),
      }),
    [t]
  );

  const otherCityLabel = t("owner.common.other");

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [ownerDeclarationAccepted, setOwnerDeclarationAccepted] = useState(false);
  const [listingRulesAccepted, setListingRulesAccepted] = useState(false);

  

  const [formData, setFormData] = useState({

    name: "",

    type: "compact",

    pricePerMinute: "",

    pricePerHour: "",

    pricePerDay: "",

    pricePerKm: "2",

    fuelType: "Benzin",

    transmission: "Otomatik",

    seats: "5",
    city: "",
    location: "",

    plateNumber: "",

    year: "",

    description: "",

    imageUrl: "",

    latitude: null as number | null,

    longitude: null as number | null,

    district: "",

    neighborhood: "",

    allowedRegionId: null as string | null,

  });

  const [allowedRegions, setAllowedRegions] = useState<AllowedRegion[]>([]);
  const [locationAllowed, setLocationAllowed] = useState<boolean | null>(null);
  const [matchedRegionName, setMatchedRegionName] = useState<string | null>(null);

  const strictRegions = allowedRegions.some((r) => r.is_active);
  const selectableCities = useMemo(() => {
    if (!strictRegions) return turkeyCities;
    const allowed = getAllowedIlNames(allowedRegions);
    return allowed.length > 0 ? allowed : turkeyCities;
  }, [allowedRegions, strictRegions]);



  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const loadRegions = async () => {
      try {
        const rows = await fetchAllowedRegions();
        setAllowedRegions(rows);
      } catch {
        setAllowedRegions([]);
      }
    };
    void loadRegions();
  }, []);

  const becomeCarOwner = async () => {

    if (!user) return;



    setLoading(true);

    try {

      const { error } = await supabase.from("user_roles").insert({

        user_id: user.id,

        role: "car_owner",

      });



      if (error) {

        if (error.code === "23505") {
          toast.success(t("owner.addCar.alreadyOwner"));
        } else {
          throw error;
        }
      } else {
        toast.success(t("owner.addCar.ownerRegistered"));
      }
    } catch (error) {
      console.error("Rol ekleme hatası:", error);
      toast.error(t("owner.common.error"));

    } finally {

      setLoading(false);

    }

  };



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();



    try {

      const validatedData = carSchema.parse({

        name: formData.name,

        type: formData.type,

        pricePerMinute: parseFloat(formData.pricePerMinute),

        pricePerHour: parseFloat(formData.pricePerHour),

        pricePerDay: parseFloat(formData.pricePerDay),

        pricePerKm: parseFloat(formData.pricePerKm || "0"),

        fuelType: formData.fuelType,

        transmission: formData.transmission,

        seats: parseInt(formData.seats),
        city: formData.city,
        location: formData.location,

        plateNumber: formData.plateNumber || undefined,

        year: formData.year ? parseInt(formData.year) : new Date().getFullYear(),

        description: formData.description || undefined,

        imageUrl: formData.imageUrl || undefined,

      });



      if (formData.latitude === null || formData.longitude === null) {
        toast.error(t("owner.addCar.toast.selectLocation"));
        return;
      }

      const locationCheck = validateLocationAgainstRegions(
        allowedRegions,
        {
          il: formData.city,
          ilce: formData.district,
          mahalle: formData.neighborhood,
          displayAddress: formData.location,
        },
        formData.latitude,
        formData.longitude,
      );

      if (!locationCheck.allowed) {
        toast.error(t(`owner.addCar.toast.region.${locationCheck.reason ?? "notAllowed"}`));
        return;
      }

      if (!ownerDeclarationAccepted || !listingRulesAccepted) {
        toast.error(t("owner.addCar.toast.acceptCheckboxes"));
        return;
      }

      setLoading(true);


      // Haritadan seçilen koordinatları kullan

      const latitude = formData.latitude;

      const longitude = formData.longitude;



      const { error } = await supabase.from("cars").insert({

        owner_id: user!.id,

        name: validatedData.name,

        type: validatedData.type,

        price_per_minute: validatedData.pricePerMinute,

        price_per_hour: validatedData.pricePerHour,

        price_per_day: validatedData.pricePerDay,

        price_per_km: validatedData.pricePerKm,

        fuel_type: validatedData.fuelType,

        transmission: validatedData.transmission,

        seats: validatedData.seats,

        location: validatedData.location,

        city: validatedData.city,
        district: formData.district || null,
        neighborhood: formData.neighborhood || null,
        allowed_region_id: locationCheck.regionId,
        plate_number: validatedData.plateNumber,

        year: validatedData.year,

        description: validatedData.description,

        image_url: validatedData.imageUrl,

        latitude,

        longitude,

        available: true,

      });



      if (error) {

        console.error("Araç ekleme hatası:", error);

        if (error.code === "42501") {
          toast.error(t("owner.addCar.toast.noPermission"));
        } else if (error.message?.includes("LOCATION_NOT_ALLOWED")) {
          toast.error(t("owner.addCar.toast.region.notAllowed"));
        } else {
          toast.error(t("owner.addCar.toast.addError", { message: error.message }));
        }
        return;
      }

      toast.success(t("owner.addCar.toast.addSuccess"));

      navigate(isAdmin ? "/admin" : "/my-cars");

    } catch (error) {

      if (error instanceof z.ZodError) {

        toast.error(error.errors[0].message);

      } else {

        console.error("Hata:", error);

        toast.error(t("owner.common.error"));
      }
    } finally {

      setLoading(false);

    }

  };



  const validateCurrentStep = () => {
    if (currentStep === 1) {
      if (!formData.name.trim() || !formData.year || !formData.city || !formData.location) {
        toast.error(t("owner.addCar.toast.fillRequired"));
        return false;
      }
      if (formData.latitude === null || formData.longitude === null) {
        toast.error(t("owner.addCar.toast.selectMapLocation"));
        return false;
      }
    }

    if (currentStep === 2 && !formData.imageUrl) {
      toast.error(t("owner.addCar.toast.uploadPhoto"));
      return false;
    }

    if (currentStep === 4) {
      if (!formData.pricePerMinute || !formData.pricePerHour || !formData.pricePerDay || !formData.pricePerKm) {
        toast.error(t("owner.addCar.toast.fillPricing"));
        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));



  if (authLoading || rolesLoading) {

    return (

      <div className="min-h-screen bg-background">

        <Navbar />

        <div className="container mx-auto px-4 pt-24 pb-12 flex items-center justify-center">

          <div className="text-center space-y-4">

            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>

            <p className="text-muted-foreground">{t("owner.common.loading")}</p>

          </div>

        </div>

        <Footer />

      </div>

    );

  }



  if (!user) {

    return (

      <div className="min-h-screen bg-background">

        <Navbar />

        <main className="pt-24 pb-12">

          <div className="container mx-auto px-4 max-w-lg">

            <Card className="text-center">

              <CardHeader>

                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">

                  <Car className="w-8 h-8 text-primary" />

                </div>

                <CardTitle className="text-2xl">{t("owner.addCar.signInRequired")}</CardTitle>
                <CardDescription>
                  {t("owner.addCar.signInDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/auth")} size="lg" className="w-full">
                  {t("owner.addCar.signInButton")}
                </Button>

              </CardContent>

            </Card>

          </div>

        </main>

        <Footer />

      </div>

    );

  }



  if (!isCarOwner && !isAdmin) {

    return (

      <div className="min-h-screen bg-background">

        <Navbar />

        <main className="pt-24 pb-12">

          <div className="container mx-auto px-4 max-w-2xl">

            <Card>

              <CardHeader className="text-center">

                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mb-4">

                  <Car className="w-10 h-10 text-primary-foreground" />

                </div>

                <CardTitle className="text-3xl">{t("owner.addCar.becomeOwnerTitle")}</CardTitle>

                <CardDescription className="text-base">
                  {t("owner.addCar.becomeOwnerDesc")}
                </CardDescription>

              </CardHeader>

              <CardContent className="space-y-6">

                <div className="grid sm:grid-cols-3 gap-4">

                  <div className="text-center p-4 bg-muted/50 rounded-lg">

                    <CreditCard className="w-8 h-8 text-primary mx-auto mb-2" />

                    <h3 className="font-semibold">{t("owner.addCar.benefitEarnings")}</h3>

                    <p className="text-sm text-muted-foreground">{t("owner.addCar.benefitEarningsDesc")}</p>
                  </div>

                  <div className="text-center p-4 bg-muted/50 rounded-lg">

                    <Shield className="w-8 h-8 text-primary mx-auto mb-2" />

                    <h3 className="font-semibold">{t("owner.addCar.benefitSecurity")}</h3>

                    <p className="text-sm text-muted-foreground">{t("owner.addCar.benefitSecurityDesc")}</p>
                  </div>

                  <div className="text-center p-4 bg-muted/50 rounded-lg">

                    <Settings className="w-8 h-8 text-primary mx-auto mb-2" />

                    <h3 className="font-semibold">{t("owner.addCar.benefitControl")}</h3>

                    <p className="text-sm text-muted-foreground">{t("owner.addCar.benefitControlDesc")}</p>

                  </div>

                </div>



                <Button onClick={becomeCarOwner} disabled={loading} size="lg" className="w-full">

                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t("owner.addCar.processing")}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      {t("owner.addCar.becomeOwnerButton")}
                    </>
                  )}

                </Button>

              </CardContent>

            </Card>

          </div>

        </main>

        <Footer />

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-background">

      <Navbar />

      

      <main className="pt-24 pb-12">

        <div className="container mx-auto px-4 max-w-3xl">

          <Link to="/my-cars" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">

            <ArrowLeft className="w-5 h-5" />

            {t("owner.addCar.backToMyCars")}
          </Link>



          <div className="text-center mb-8">

            <h1 className="text-3xl font-bold text-foreground mb-2">{t("owner.addCar.title")}</h1>

            <p className="text-muted-foreground">{t("owner.addCar.subtitle")}</p>

          </div>



          {/* Progress Steps */}

          <div className="mb-8">

            <div className="flex justify-between items-center mb-4">

              {[
                { num: 1, label: t("owner.addCar.steps.info"), icon: Car },
                { num: 2, label: t("owner.addCar.steps.photo"), icon: Image },
                { num: 3, label: t("owner.addCar.steps.specs"), icon: Settings },
                { num: 4, label: t("owner.addCar.steps.pricing"), icon: CreditCard },
                { num: 5, label: t("owner.addCar.steps.license"), icon: Shield },
              ].map((step, index) => (

                <div key={step.num} className="flex items-center">

                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${

                    currentStep >= step.num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"

                  }`}>

                    <step.icon className="w-5 h-5" />

                  </div>

                  <span className={`ml-2 text-sm font-medium hidden sm:inline ${

                    currentStep >= step.num ? "text-foreground" : "text-muted-foreground"

                  }`}>

                    {step.label}

                  </span>

                  {index < 4 && (

                    <div className={`w-8 sm:w-16 h-1 mx-2 rounded ${

                      currentStep > step.num ? "bg-primary" : "bg-muted"

                    }`} />

                  )}

                </div>

              ))}

            </div>

            <Progress value={(currentStep / 5) * 100} className="h-2" />

          </div>



          <Card>

            <CardContent className="pt-6">

              <form onSubmit={handleSubmit}>

                {/* Step 1: Araç Bilgileri */}

                {currentStep === 1 && (

                  <div className="space-y-6 animate-in fade-in duration-300">

                    <div className="space-y-2">

                      <Label htmlFor="name">{t("owner.addCar.fields.name")}</Label>

                      <Input

                        id="name"

                        value={formData.name}

                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}

                        placeholder={t("owner.addCar.fields.namePlaceholder")}

                        required

                      />

                    </div>



                    <div className="grid sm:grid-cols-2 gap-4">

                      <div className="space-y-2">

                        <Label htmlFor="type">{t("owner.addCar.fields.type")}</Label>

                        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>

                          <SelectTrigger>

                            <SelectValue />

                          </SelectTrigger>

                          <SelectContent>

                            <SelectItem value="compact">{t("owner.common.carTypes.compact")}</SelectItem>

                            <SelectItem value="sedan">{t("owner.common.carTypes.sedan")}</SelectItem>

                            <SelectItem value="suv">{t("owner.common.carTypes.suv")}</SelectItem>

                          </SelectContent>

                        </Select>

                      </div>



                      <div className="space-y-2">

                        <Label htmlFor="year">{t("owner.addCar.fields.year")}</Label>

                        <Input

                          id="year"

                          type="number"

                          min="2010"

                          max={new Date().getFullYear() + 1}

                          value={formData.year}

                          onChange={(e) => setFormData({ ...formData, year: e.target.value })}

                          placeholder={t("owner.addCar.fields.yearPlaceholder")}

                          required

                        />

                      </div>

                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">{t("owner.addCar.fields.city")}</Label>
                      <Select value={formData.city} onValueChange={(value) => setFormData({ ...formData, city: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("owner.addCar.fields.cityPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {selectableCities.map((city) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>





                    <div className="space-y-2">

                      <Label className="flex items-center gap-2">

                        <MapPin className="w-4 h-4" />

                        {t("owner.addCar.fields.location")}

                      </Label>

                      <LocationPickerMap

                        initialLat={formData.latitude || 41.0082}

                        initialLng={formData.longitude || 28.9784}

                        height="300px"

                        onLocationSelect={(lat, lng, result) => {

                          const address = result?.address ?? "";
                          const parsed = result?.components;
                          const derivedCity = address ? extractCityFromLocation(address, otherCityLabel) : "";
                          const city =
                            parsed?.il ||
                            (derivedCity && derivedCity !== otherCityLabel ? derivedCity : formData.city);

                          const check = validateLocationAgainstRegions(
                            allowedRegions,
                            {
                              il: city,
                              ilce: parsed?.ilce ?? "",
                              mahalle: parsed?.mahalle ?? "",
                              displayAddress: address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                            },
                            lat,
                            lng,
                          );

                          setLocationAllowed(check.allowed);
                          setMatchedRegionName(check.matchedRegionName);

                          if (check.strictMode && !check.allowed) {
                            toast.error(t(`owner.addCar.toast.region.${check.reason ?? "notAllowed"}`));
                          }

                          setFormData({

                            ...formData,

                            latitude: lat,

                            longitude: lng,

                            location: address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                            city,
                            district: parsed?.ilce ?? "",
                            neighborhood: parsed?.mahalle ?? "",
                            allowedRegionId: check.regionId,

                          });

                        }}

                      />

                      {formData.location && (

                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-muted-foreground">
                            {t("owner.addCar.fields.selectedAddress")} {formData.location}
                          </p>
                          {(formData.district || formData.neighborhood) && (
                            <p className="text-xs text-muted-foreground">
                              {formData.district}
                              {formData.neighborhood ? ` / ${formData.neighborhood}` : ""}
                            </p>
                          )}
                          {strictRegions && locationAllowed === true && matchedRegionName && (
                            <p className="text-xs text-green-600 dark:text-green-400">
                              {t("owner.addCar.fields.regionApproved")}: {matchedRegionName}
                            </p>
                          )}
                          {strictRegions && locationAllowed === false && (
                            <p className="text-xs text-destructive">
                              {t("owner.addCar.fields.regionNotAllowed")}
                            </p>
                          )}
                        </div>

                      )}

                    </div>



                    <div className="space-y-2">

                      <Label htmlFor="plateNumber">{t("owner.addCar.fields.plate")}</Label>

                      <Input

                        id="plateNumber"

                        value={formData.plateNumber}

                        onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}

                        placeholder={t("owner.addCar.fields.platePlaceholder")}

                      />

                    </div>



                    <div className="flex justify-end">

                      <Button type="button" onClick={nextStep}>
                        {t("owner.common.continue")}
                      </Button>

                    </div>

                  </div>

                )}



                {/* Step 2: Fotoğraf */}

                {currentStep === 2 && (

                  <div className="space-y-6 animate-in fade-in duration-300">

                    <div className="space-y-2">

                      <Label className="flex items-center gap-2">

                        <Image className="w-4 h-4" />

                        {t("owner.addCar.fields.photo")}
                      </Label>

                      <p className="text-sm text-muted-foreground mb-4">
                        {t("owner.addCar.fields.photoDesc")}
                      </p>

                      <CarImageUpload

                        userId={user?.id || ""}

                        currentImageUrl={formData.imageUrl}

                        onImageUploaded={(url) => setFormData({ ...formData, imageUrl: url })}

                      />

                    </div>



                    <div className="flex justify-between">

                      <Button type="button" variant="outline" onClick={prevStep}>

                        {t("owner.common.back")}
                      </Button>

                      <Button type="button" onClick={nextStep}>
                        {t("owner.common.continue")}
                      </Button>

                    </div>

                  </div>

                )}



                {/* Step 3: Teknik Özellikler */}

                {currentStep === 3 && (

                  <div className="space-y-6 animate-in fade-in duration-300">

                    <div className="grid sm:grid-cols-2 gap-4">

                      <div className="space-y-2">

                        <Label htmlFor="fuelType" className="flex items-center gap-2">

                          <Fuel className="w-4 h-4" />

                          {t("owner.addCar.fields.fuelType")}
                        </Label>

                        <Select value={formData.fuelType} onValueChange={(value) => setFormData({ ...formData, fuelType: value })}>

                          <SelectTrigger>

                            <SelectValue />

                          </SelectTrigger>

                          <SelectContent>

                            <SelectItem value="Benzin">{t("owner.common.fuelTypes.Benzin")}</SelectItem>

                            <SelectItem value="Dizel">{t("owner.common.fuelTypes.Dizel")}</SelectItem>

                            <SelectItem value="Elektrik">{t("owner.common.fuelTypes.Elektrik")}</SelectItem>

                            <SelectItem value="Hibrit">{t("owner.common.fuelTypes.Hibrit")}</SelectItem>

                          </SelectContent>

                        </Select>

                      </div>



                      <div className="space-y-2">

                        <Label htmlFor="transmission">{t("owner.addCar.fields.transmission")}</Label>

                        <Select value={formData.transmission} onValueChange={(value) => setFormData({ ...formData, transmission: value })}>

                          <SelectTrigger>

                            <SelectValue />

                          </SelectTrigger>

                          <SelectContent>

                            <SelectItem value="Manuel">{t("owner.common.transmission.Manuel")}</SelectItem>

                            <SelectItem value="Otomatik">{t("owner.common.transmission.Otomatik")}</SelectItem>

                          </SelectContent>

                        </Select>

                      </div>

                    </div>



                    <div className="space-y-2">

                      <Label htmlFor="seats">{t("owner.addCar.fields.seats")}</Label>

                      <Select value={formData.seats} onValueChange={(value) => setFormData({ ...formData, seats: value })}>

                        <SelectTrigger>

                          <SelectValue />

                        </SelectTrigger>

                        <SelectContent>

                          {[2, 4, 5, 6, 7, 8, 9].map((num) => (

                            <SelectItem key={num} value={num.toString()}>

                              {t("owner.common.seatsLabel", { count: num })}

                            </SelectItem>

                          ))}

                        </SelectContent>

                      </Select>

                    </div>



                    <div className="space-y-2">

                      <Label htmlFor="description">{t("owner.addCar.fields.description")}</Label>

                      <Textarea

                        id="description"

                        value={formData.description}

                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}

                        placeholder={t("owner.addCar.fields.descriptionPlaceholder")}

                        rows={4}

                        maxLength={500}

                      />

                      <p className="text-sm text-muted-foreground text-right">{formData.description.length}/500</p>

                    </div>



                    <div className="flex justify-between">

                      <Button type="button" variant="outline" onClick={prevStep}>

                        {t("owner.common.back")}
                      </Button>

                      <Button type="button" onClick={nextStep}>
                        {t("owner.common.continue")}
                      </Button>

                    </div>

                  </div>

                )}



                {/* Step 4: Fiyatlandırma */}

                {currentStep === 4 && (

                  <div className="space-y-6 animate-in fade-in duration-300">

                    <div className="grid sm:grid-cols-3 gap-4">

                      <div className="space-y-2">

                        <Label htmlFor="pricePerMinute">{t("owner.addCar.fields.pricePerMinute")}</Label>

                        <Input

                          id="pricePerMinute"

                          type="number"

                          step="0.1"

                          min="0.1"

                          value={formData.pricePerMinute}

                          onChange={(e) => setFormData({ ...formData, pricePerMinute: e.target.value })}

                          placeholder="0.50"

                          required

                        />

                      </div>



                      <div className="space-y-2">

                        <Label htmlFor="pricePerHour">{t("owner.addCar.fields.pricePerHour")}</Label>

                        <Input

                          id="pricePerHour"

                          type="number"

                          step="1"

                          min="1"

                          value={formData.pricePerHour}

                          onChange={(e) => setFormData({ ...formData, pricePerHour: e.target.value })}

                          placeholder="25"

                          required

                        />

                      </div>



                      <div className="space-y-2">

                        <Label htmlFor="pricePerDay">{t("owner.addCar.fields.pricePerDay")}</Label>

                        <Input

                          id="pricePerDay"

                          type="number"

                          step="1"

                          min="10"

                          value={formData.pricePerDay}

                          onChange={(e) => setFormData({ ...formData, pricePerDay: e.target.value })}

                          placeholder="150"

                          required

                        />

                      </div>

                    </div>



                    <div className="space-y-2">

                      <Label htmlFor="pricePerKm">{t("owner.addCar.fields.pricePerKm")}</Label>

                        <Input

                          id="pricePerKm"

                          type="number"

                          step="0.1"

                          min="0"

                          value={formData.pricePerKm}

                          onChange={(e) => setFormData({ ...formData, pricePerKm: e.target.value })}

                          placeholder="2.5"

                          required

                        />

                        <p className="text-sm text-muted-foreground">

                          {t("owner.addCar.fields.pricePerKmDesc")}

                        </p>

                      </div>



                      <div className="bg-muted/50 p-4 rounded-lg space-y-2">

                        <h4 className="font-medium">{t("owner.addCar.estimatedEarnings")}</h4>

                        <p className="text-sm text-muted-foreground">
                          {t("owner.addCar.estimatedEarningsDesc", { price: formData.pricePerDay || 0 })}{" "}

                          <span className="font-semibold text-primary">

                            {((parseFloat(formData.pricePerDay) || 0) * 15).toLocaleString("tr-TR")} ₺

                          </span>

                        </p>

                      </div>




                      <div className="flex justify-between">

                        <Button type="button" variant="outline" onClick={prevStep}>

                          {t("owner.common.back")}

                        </Button>

                        <Button type="button" onClick={nextStep}>

                          {t("owner.common.continue")}

                        </Button>

                      </div>

                    </div>

                  )}



                  {/* Step 5: Ehliyet */}

                  {currentStep === 5 && (

                    <div className="space-y-6 animate-in fade-in duration-300">

                      <div className="space-y-2">

                        <Label className="flex items-center gap-2">

                          <Shield className="w-4 h-4" />

                          {t("owner.addCar.fields.license")}
                        </Label>

                        <p className="text-sm text-muted-foreground mb-4">
                          {t("owner.addCar.fields.licenseDesc")}
                        </p>

                        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">

                          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />

                          <p className="text-muted-foreground mb-4">
                            {t("owner.addCar.fields.licenseUpload")}
                          </p>

                          <Button variant="outline" type="button">

                            <Image className="w-4 h-4 mr-2" />

                            {t("owner.addCar.fields.licenseUploadButton")}
                          </Button>

                        </div>

                        <p className="text-xs text-muted-foreground mt-2">
                          {t("owner.addCar.fields.licenseRequired")}
                        </p>
                      <div className="rounded-lg border p-4 space-y-4">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="ownerDeclaration"
                            checked={ownerDeclarationAccepted}
                            onCheckedChange={(checked) => setOwnerDeclarationAccepted(Boolean(checked))}
                          />
                          <label htmlFor="ownerDeclaration" className="text-sm leading-relaxed cursor-pointer">
                            {t("owner.addCar.ownerDeclaration")}
                          </label>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="listingRules"
                            checked={listingRulesAccepted}
                            onCheckedChange={(checked) => setListingRulesAccepted(Boolean(checked))}
                          />
                          <label htmlFor="listingRules" className="text-sm leading-relaxed cursor-pointer">
                            {t("owner.addCar.listingRules")}
                          </label>
                        </div>
                      </div>

                      </div>



                      <div className="flex justify-between">

                        <Button type="button" variant="outline" onClick={prevStep}>

                          {t("owner.common.back")}

                        </Button>

                        <Button type="submit" disabled={loading || !ownerDeclarationAccepted || !listingRulesAccepted}>

                          {loading ? (

                            <>

                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>

                              {t("owner.addCar.adding")}

                            </>

                          ) : (

                            <>

                              <CheckCircle2 className="w-5 h-5 mr-2" />

                              {t("owner.addCar.submit")}

                            </>

                          )}

                        </Button>

                      </div>

                    </div>

                  )}

              </form>

            </CardContent>

          </Card>

        </div>

      </main>



      <Footer />

    </div>

  );

};



export default AddCar;






import { useState, useEffect } from "react";

import { useNavigate, Link } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";

import Navbar from "@/components/Navbar";

import Footer from "@/components/Footer";

import { Button } from "@/components/ui/button";

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

const extractCityFromLocation = (location: string): string => {

  const lowerLocation = location.toLocaleLowerCase("tr");

  const match = turkeyCities.find((city) =>

    lowerLocation.includes(city.toLocaleLowerCase("tr"))

  );

  return match || "Diğer";

};



const carSchema = z.object({

  name: z.string().min(2, "AraÃ§ adÄ± en az 2 karakter olmalÄ±dÄ±r").max(100),

  type: z.enum(["compact", "sedan", "suv"]),

  pricePerMinute: z.number().min(0.1, "Fiyat 0'dan bÃ¼yÃ¼k olmalÄ±dÄ±r"),

  pricePerHour: z.number().min(1, "Fiyat 0'dan bÃ¼yÃ¼k olmalÄ±dÄ±r"),

  pricePerDay: z.number().min(10, "Fiyat 10'dan bÃ¼yÃ¼k olmalÄ±dÄ±r"),

  pricePerKm: z.number().min(0, "KM baÅŸÄ± fiyat 0'dan bÃ¼yÃ¼k veya eÅŸit olmalÄ±dÄ±r"),

  fuelType: z.enum(["Benzin", "Dizel", "Elektrik", "Hibrit"]),

  transmission: z.enum(["Manuel", "Otomatik"]),

  seats: z.number().min(2).max(9),
  city: z.string().min(2, "Lütfen geçerli bir il seçin"),
  location: z.string().min(3, "Lokasyon en az 3 karakter olmalÄ±dÄ±r"),

  plateNumber: z.string().optional(),

  year: z.number().min(2010, "2010 ve Ã¼zeri model yÄ±lÄ± araÃ§lar kabul edilmektedir").max(new Date().getFullYear() + 1),

  description: z.string().max(500, "AÃ§Ä±klama en fazla 500 karakter olabilir").optional(),

  imageUrl: z.string().optional(),

});



const AddCar = () => {

  const { user, loading: authLoading } = useAuth();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [isCarOwner, setIsCarOwner] = useState<boolean | null>(null);

  const [checkingRole, setCheckingRole] = useState(true);

  const [currentStep, setCurrentStep] = useState(1);

  

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

  });



  useEffect(() => {

    const checkCarOwnerRole = async () => {

      if (!user) {

        setCheckingRole(false);

        return;

      }



      try {

        const { data, error } = await supabase

          .from("user_roles")

          .select("role")

          .eq("user_id", user.id)

          .eq("role", "car_owner")

          .maybeSingle();



        if (error) {

          console.error("Rol kontrol hatasÄ±:", error);

          setIsCarOwner(false);

        } else {

          setIsCarOwner(!!data);

        }

      } catch (error) {

        console.error("Rol kontrol hatasÄ±:", error);

        setIsCarOwner(false);

      } finally {

        setCheckingRole(false);

      }

    };



    if (!authLoading) {

      checkCarOwnerRole();

    }

  }, [user, authLoading]);



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

          setIsCarOwner(true);

          toast.success("Zaten araÃ§ sahibi rolÃ¼ne sahipsiniz!");

        } else {

          throw error;

        }

      } else {

        setIsCarOwner(true);

        toast.success("AraÃ§ sahibi olarak kaydÄ±nÄ±z tamamlandÄ±!");

      }

    } catch (error) {

      console.error("Rol ekleme hatasÄ±:", error);

      toast.error("Bir hata oluÅŸtu. LÃ¼tfen tekrar deneyin.");

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
        toast.error("Lütfen haritadan konum seçin.");
        return;
      }

      setLoading(true);


      // Haritadan seÃ§ilen koordinatlarÄ± kullan

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
        plate_number: validatedData.plateNumber,

        year: validatedData.year,

        description: validatedData.description,

        image_url: validatedData.imageUrl,

        latitude,

        longitude,

        available: true,

      });



      if (error) {

        console.error("AraÃ§ ekleme hatasÄ±:", error);

        if (error.code === "42501") {

          toast.error("AraÃ§ ekleme yetkiniz bulunmuyor. LÃ¼tfen araÃ§ sahibi olarak kayÄ±t olun.");

        } else {

          toast.error("AraÃ§ eklenirken bir hata oluÅŸtu: " + error.message);

        }

        return;

      }



      toast.success("AraÃ§ baÅŸarÄ±yla eklendi!");

      navigate("/my-cars");

    } catch (error) {

      if (error instanceof z.ZodError) {

        toast.error(error.errors[0].message);

      } else {

        console.error("Hata:", error);

        toast.error("Bir hata oluÅŸtu");

      }

    } finally {

      setLoading(false);

    }

  };



  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4));

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));



  if (authLoading || checkingRole) {

    return (

      <div className="min-h-screen bg-background">

        <Navbar />

        <div className="container mx-auto px-4 pt-24 pb-12 flex items-center justify-center">

          <div className="text-center space-y-4">

            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>

            <p className="text-muted-foreground">YÃ¼kleniyor...</p>

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

                <CardTitle className="text-2xl">GiriÅŸ YapmalÄ±sÄ±nÄ±z</CardTitle>

                <CardDescription>

                  AraÃ§ eklemek iÃ§in Ã¶nce hesabÄ±nÄ±za giriÅŸ yapmanÄ±z gerekmektedir.

                </CardDescription>

              </CardHeader>

              <CardContent>

                <Button onClick={() => navigate("/auth")} size="lg" className="w-full">

                  GiriÅŸ Yap / Ãœye Ol

                </Button>

              </CardContent>

            </Card>

          </div>

        </main>

        <Footer />

      </div>

    );

  }



  if (!isCarOwner) {

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

                <CardTitle className="text-3xl">AraÃ§ Sahibi Olun</CardTitle>

                <CardDescription className="text-base">

                  RideYo platformunda araÃ§ kiralayarak gelir elde etmeye baÅŸlayÄ±n

                </CardDescription>

              </CardHeader>

              <CardContent className="space-y-6">

                <div className="grid sm:grid-cols-3 gap-4">

                  <div className="text-center p-4 bg-muted/50 rounded-lg">

                    <CreditCard className="w-8 h-8 text-primary mx-auto mb-2" />

                    <h3 className="font-semibold">KazanÃ§</h3>

                    <p className="text-sm text-muted-foreground">Pasif gelir elde edin</p>

                  </div>

                  <div className="text-center p-4 bg-muted/50 rounded-lg">

                    <Shield className="w-8 h-8 text-primary mx-auto mb-2" />

                    <h3 className="font-semibold">GÃ¼venlik</h3>

                    <p className="text-sm text-muted-foreground">SigortalÄ± kiralama</p>

                  </div>

                  <div className="text-center p-4 bg-muted/50 rounded-lg">

                    <Settings className="w-8 h-8 text-primary mx-auto mb-2" />

                    <h3 className="font-semibold">Kontrol</h3>

                    <p className="text-sm text-muted-foreground">Fiyat & takvim yÃ¶netimi</p>

                  </div>

                </div>

                

                <Button onClick={becomeCarOwner} disabled={loading} size="lg" className="w-full">

                  {loading ? (

                    <>

                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>

                      Ä°ÅŸleniyor...

                    </>

                  ) : (

                    <>

                      <CheckCircle2 className="w-5 h-5 mr-2" />

                      AraÃ§ Sahibi Ol

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

            AraÃ§larÄ±ma DÃ¶n

          </Link>



          <div className="text-center mb-8">

            <h1 className="text-3xl font-bold text-foreground mb-2">Yeni AraÃ§ Ekle</h1>

            <p className="text-muted-foreground">AracÄ±nÄ±zÄ± ekleyerek gelir elde etmeye baÅŸlayÄ±n</p>

          </div>



          {/* Progress Steps */}

          <div className="mb-8">

            <div className="flex justify-between items-center mb-4">

              {[

                { num: 1, label: "AraÃ§ Bilgileri", icon: Car },

                { num: 2, label: "FotoÄŸraf", icon: Image },

                { num: 3, label: "Teknik Ã–zellikler", icon: Settings },

                { num: 4, label: "FiyatlandÄ±rma", icon: CreditCard },

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

                  {index < 3 && (

                    <div className={`w-8 sm:w-16 h-1 mx-2 rounded ${

                      currentStep > step.num ? "bg-primary" : "bg-muted"

                    }`} />

                  )}

                </div>

              ))}

            </div>

            <Progress value={(currentStep / 4) * 100} className="h-2" />

          </div>



          <Card>

            <CardContent className="pt-6">

              <form onSubmit={handleSubmit}>

                {/* Step 1: AraÃ§ Bilgileri */}

                {currentStep === 1 && (

                  <div className="space-y-6 animate-in fade-in duration-300">

                    <div className="space-y-2">

                      <Label htmlFor="name">AraÃ§ AdÄ± *</Label>

                      <Input

                        id="name"

                        value={formData.name}

                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}

                        placeholder="Ã¶rn: Renault Clio 2022"

                        required

                      />

                    </div>



                    <div className="grid sm:grid-cols-2 gap-4">

                      <div className="space-y-2">

                        <Label htmlFor="type">AraÃ§ Tipi *</Label>

                        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>

                          <SelectTrigger>

                            <SelectValue />

                          </SelectTrigger>

                          <SelectContent>

                            <SelectItem value="compact">Kompakt</SelectItem>

                            <SelectItem value="sedan">Sedan</SelectItem>

                            <SelectItem value="suv">SUV</SelectItem>

                          </SelectContent>

                        </Select>

                      </div>



                      <div className="space-y-2">

                        <Label htmlFor="year">Model Yılı *</Label>

                        <Input

                          id="year"

                          type="number"

                          min="2010"

                          max={new Date().getFullYear() + 1}

                          value={formData.year}

                          onChange={(e) => setFormData({ ...formData, year: e.target.value })}

                          placeholder="Örn: 2022"

                          required

                        />

                      </div>

                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">İl *</Label>
                      <Select value={formData.city} onValueChange={(value) => setFormData({ ...formData, city: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="İl seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {turkeyCities.map((city) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>





                    <div className="space-y-2">

                      <Label className="flex items-center gap-2">

                        <MapPin className="w-4 h-4" />

                        Lokasyon *

                      </Label>

                      <LocationPickerMap

                        initialLat={formData.latitude || 41.0082}

                        initialLng={formData.longitude || 28.9784}

                        height="300px"

                        onLocationSelect={(lat, lng, address) => {

                          const derivedCity = address ? extractCityFromLocation(address) : "";

                          setFormData({

                            ...formData,

                            latitude: lat,

                            longitude: lng,

                            location: address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                            city: derivedCity && derivedCity !== "Diğer" ? derivedCity : formData.city,

                          });

                        }}

                      />

                      {formData.location && (

                        <p className="text-sm text-muted-foreground mt-2">

                          SeÃ§ilen adres: {formData.location}

                        </p>

                      )}

                    </div>



                    <div className="space-y-2">

                      <Label htmlFor="plateNumber">Plaka (Opsiyonel)</Label>

                      <Input

                        id="plateNumber"

                        value={formData.plateNumber}

                        onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}

                        placeholder="Ã¶rn: 25 ABC 123"

                      />

                    </div>



                    <div className="flex justify-end">

                      <Button type="button" onClick={nextStep}>

                        Devam Et

                      </Button>

                    </div>

                  </div>

                )}



                {/* Step 2: FotoÄŸraf */}

                {currentStep === 2 && (

                  <div className="space-y-6 animate-in fade-in duration-300">

                    <div className="space-y-2">

                      <Label className="flex items-center gap-2">

                        <Image className="w-4 h-4" />

                        AraÃ§ FotoÄŸrafÄ±

                      </Label>

                      <p className="text-sm text-muted-foreground mb-4">

                        AracÄ±nÄ±zÄ±n net ve kaliteli bir fotoÄŸrafÄ±nÄ± yÃ¼kleyin. Bu fotoÄŸraf araÃ§ listesinde gÃ¶rÃ¼necektir.

                      </p>

                      <CarImageUpload

                        userId={user?.id || ""}

                        currentImageUrl={formData.imageUrl}

                        onImageUploaded={(url) => setFormData({ ...formData, imageUrl: url })}

                      />

                    </div>



                    <div className="flex justify-between">

                      <Button type="button" variant="outline" onClick={prevStep}>

                        Geri

                      </Button>

                      <Button type="button" onClick={nextStep}>

                        Devam Et

                      </Button>

                    </div>

                  </div>

                )}



                {/* Step 3: Teknik Ã–zellikler */}

                {currentStep === 3 && (

                  <div className="space-y-6 animate-in fade-in duration-300">

                    <div className="grid sm:grid-cols-2 gap-4">

                      <div className="space-y-2">

                        <Label htmlFor="fuelType" className="flex items-center gap-2">

                          <Fuel className="w-4 h-4" />

                          YakÄ±t Tipi *

                        </Label>

                        <Select value={formData.fuelType} onValueChange={(value) => setFormData({ ...formData, fuelType: value })}>

                          <SelectTrigger>

                            <SelectValue />

                          </SelectTrigger>

                          <SelectContent>

                            <SelectItem value="Benzin">Benzin</SelectItem>

                            <SelectItem value="Dizel">Dizel</SelectItem>

                            <SelectItem value="Elektrik">Elektrik</SelectItem>

                            <SelectItem value="Hibrit">Hibrit</SelectItem>

                          </SelectContent>

                        </Select>

                      </div>



                      <div className="space-y-2">

                        <Label htmlFor="transmission">Vites *</Label>

                        <Select value={formData.transmission} onValueChange={(value) => setFormData({ ...formData, transmission: value })}>

                          <SelectTrigger>

                            <SelectValue />

                          </SelectTrigger>

                          <SelectContent>

                            <SelectItem value="Manuel">Manuel</SelectItem>

                            <SelectItem value="Otomatik">Otomatik</SelectItem>

                          </SelectContent>

                        </Select>

                      </div>

                    </div>



                    <div className="space-y-2">

                      <Label htmlFor="seats">Koltuk SayÄ±sÄ± *</Label>

                      <Select value={formData.seats} onValueChange={(value) => setFormData({ ...formData, seats: value })}>

                        <SelectTrigger>

                          <SelectValue />

                        </SelectTrigger>

                        <SelectContent>

                          {[2, 4, 5, 6, 7, 8, 9].map((num) => (

                            <SelectItem key={num} value={num.toString()}>

                              {num} Koltuk

                            </SelectItem>

                          ))}

                        </SelectContent>

                      </Select>

                    </div>



                    <div className="space-y-2">

                      <Label htmlFor="description">AÃ§Ä±klama (Opsiyonel)</Label>

                      <Textarea

                        id="description"

                        value={formData.description}

                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}

                        placeholder="AraÃ§ hakkÄ±nda ek bilgiler..."

                        rows={4}

                        maxLength={500}

                      />

                      <p className="text-sm text-muted-foreground text-right">{formData.description.length}/500</p>

                    </div>



                    <div className="flex justify-between">

                      <Button type="button" variant="outline" onClick={prevStep}>

                        Geri

                      </Button>

                      <Button type="button" onClick={nextStep}>

                        Devam Et

                      </Button>

                    </div>

                  </div>

                )}



                {/* Step 4: FiyatlandÄ±rma */}

                {currentStep === 4 && (

                  <div className="space-y-6 animate-in fade-in duration-300">

                    <div className="grid sm:grid-cols-3 gap-4">

                      <div className="space-y-2">

                        <Label htmlFor="pricePerMinute">Dakika FiyatÄ± (â‚º) *</Label>

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

                        <Label htmlFor="pricePerHour">Saat FiyatÄ± (â‚º) *</Label>

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

                        <Label htmlFor="pricePerDay">GÃ¼nlÃ¼k Fiyat (â‚º) *</Label>

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

                      <Label htmlFor="pricePerKm">KM BaÅŸÄ± Fiyat (â‚º) *</Label>

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

                        AraÃ§ kiralama sÃ¼resi dÄ±ÅŸÄ±nda yapÄ±lan her km iÃ§in Ã¼cret

                      </p>

                    </div>



                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">

                      <h4 className="font-medium">Tahmini KazanÃ§</h4>

                      <p className="text-sm text-muted-foreground">

                        GÃ¼nlÃ¼k {formData.pricePerDay || 0} â‚º fiyatla ayda ortalama 15 gÃ¼n kiralama yaparsanÄ±z:{" "}

                        <span className="font-semibold text-primary">

                          {((parseFloat(formData.pricePerDay) || 0) * 15).toLocaleString("tr-TR")} â‚º

                        </span>

                      </p>

                    </div>



                    <div className="flex justify-between">

                      <Button type="button" variant="outline" onClick={prevStep}>

                        Geri

                      </Button>

                      <Button type="submit" disabled={loading}>

                        {loading ? (

                          <>

                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>

                            Ekleniyor...

                          </>

                        ) : (

                          <>

                            <CheckCircle2 className="w-5 h-5 mr-2" />

                            AraÃ§ Ekle

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


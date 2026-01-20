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

// Function to extract city from location text
const extractCityFromLocation = (location: string): string => {
  const cities = [
    "istanbul", "ankara", "izmir", "bursa", "antalya", "trabzon", "erzurum",
    "konya", "adana", "mersin", "samsun", "kayseri", "eskişehir", "gaziantep",
    "diyarbakır", "şanlıurfa", "malatya", "van", "denizli", "kocaeli", "sakarya",
    "muğla", "aydın", "manisa", "balıkesir", "tekirdağ", "edirne", "çanakkale",
    "hatay", "kahramanmaraş", "mardin", "batman", "elazığ", "ağrı", "kars",
    "rize", "giresun", "ordu", "artvin", "gümüşhane", "bayburt", "bingöl",
    "muş", "bitlis", "siirt", "şırnak", "hakkari", "tunceli", "iğdır", "ardahan",
    "aksaray", "niğde", "nevşehir", "kırşehir", "yozgat", "çorum", "amasya",
    "tokat", "sinop", "kastamonu", "çankırı", "karabük", "bartın", "zonguldak",
    "bolu", "düzce", "bilecik", "kütahya", "afyon", "uşak", "ısparta", "burdur"
  ];
  
  const lowerLocation = location.toLowerCase();
  for (const city of cities) {
    if (lowerLocation.includes(city)) {
      return city.charAt(0).toUpperCase() + city.slice(1);
    }
  }
  return "Diğer";
};

const carSchema = z.object({
  name: z.string().min(2, "Araç adı en az 2 karakter olmalıdır").max(100),
  type: z.enum(["compact", "sedan", "suv"]),
  pricePerMinute: z.number().min(0.1, "Fiyat 0'dan büyük olmalıdır"),
  pricePerHour: z.number().min(1, "Fiyat 0'dan büyük olmalıdır"),
  pricePerDay: z.number().min(10, "Fiyat 10'dan büyük olmalıdır"),
  pricePerKm: z.number().min(0, "KM başı fiyat 0'dan büyük veya eşit olmalıdır"),
  fuelType: z.enum(["Benzin", "Dizel", "Elektrik", "Hibrit"]),
  transmission: z.enum(["Manuel", "Otomatik"]),
  seats: z.number().min(2).max(9),
  location: z.string().min(3, "Lokasyon en az 3 karakter olmalıdır"),
  plateNumber: z.string().optional(),
  year: z.number().min(2010, "2010 ve üzeri model yılı araçlar kabul edilmektedir").max(new Date().getFullYear() + 1),
  description: z.string().max(500, "Açıklama en fazla 500 karakter olabilir").optional(),
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
          console.error("Rol kontrol hatası:", error);
          setIsCarOwner(false);
        } else {
          setIsCarOwner(!!data);
        }
      } catch (error) {
        console.error("Rol kontrol hatası:", error);
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
          toast.success("Zaten araç sahibi rolüne sahipsiniz!");
        } else {
          throw error;
        }
      } else {
        setIsCarOwner(true);
        toast.success("Araç sahibi olarak kaydınız tamamlandı!");
      }
    } catch (error) {
      console.error("Rol ekleme hatası:", error);
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
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
        location: formData.location,
        plateNumber: formData.plateNumber || undefined,
        year: formData.year ? parseInt(formData.year) : new Date().getFullYear(),
        description: formData.description || undefined,
        imageUrl: formData.imageUrl || undefined,
      });

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
        city: extractCityFromLocation(validatedData.location),
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
          toast.error("Araç ekleme yetkiniz bulunmuyor. Lütfen araç sahibi olarak kayıt olun.");
        } else {
          toast.error("Araç eklenirken bir hata oluştu: " + error.message);
        }
        return;
      }

      toast.success("Araç başarıyla eklendi!");
      navigate("/my-cars");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Hata:", error);
        toast.error("Bir hata oluştu");
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
            <p className="text-muted-foreground">Yükleniyor...</p>
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
                <CardTitle className="text-2xl">Giriş Yapmalısınız</CardTitle>
                <CardDescription>
                  Araç eklemek için önce hesabınıza giriş yapmanız gerekmektedir.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/auth")} size="lg" className="w-full">
                  Giriş Yap / Üye Ol
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
                <CardTitle className="text-3xl">Araç Sahibi Olun</CardTitle>
                <CardDescription className="text-base">
                  RideYo platformunda araç kiralayarak gelir elde etmeye başlayın
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <CreditCard className="w-8 h-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold">Kazanç</h3>
                    <p className="text-sm text-muted-foreground">Pasif gelir elde edin</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold">Güvenlik</h3>
                    <p className="text-sm text-muted-foreground">Sigortalı kiralama</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Settings className="w-8 h-8 text-primary mx-auto mb-2" />
                    <h3 className="font-semibold">Kontrol</h3>
                    <p className="text-sm text-muted-foreground">Fiyat & takvim yönetimi</p>
                  </div>
                </div>
                
                <Button onClick={becomeCarOwner} disabled={loading} size="lg" className="w-full">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      İşleniyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Araç Sahibi Ol
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
            Araçlarıma Dön
          </Link>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Yeni Araç Ekle</h1>
            <p className="text-muted-foreground">Aracınızı ekleyerek gelir elde etmeye başlayın</p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              {[
                { num: 1, label: "Araç Bilgileri", icon: Car },
                { num: 2, label: "Fotoğraf", icon: Image },
                { num: 3, label: "Teknik Özellikler", icon: Settings },
                { num: 4, label: "Fiyatlandırma", icon: CreditCard },
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
                {/* Step 1: Araç Bilgileri */}
                {currentStep === 1 && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="space-y-2">
                      <Label htmlFor="name">Araç Adı *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="örn: Renault Clio 2022"
                        required
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Araç Tipi *</Label>
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
                          placeholder="örn: 2022"
                          required
                        />
                      </div>
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
                          setFormData({
                            ...formData,
                            latitude: lat,
                            longitude: lng,
                            location: address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                          });
                        }}
                      />
                      {formData.location && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Seçilen adres: {formData.location}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="plateNumber">Plaka (Opsiyonel)</Label>
                      <Input
                        id="plateNumber"
                        value={formData.plateNumber}
                        onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                        placeholder="örn: 25 ABC 123"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button type="button" onClick={nextStep}>
                        Devam Et
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
                        Araç Fotoğrafı
                      </Label>
                      <p className="text-sm text-muted-foreground mb-4">
                        Aracınızın net ve kaliteli bir fotoğrafını yükleyin. Bu fotoğraf araç listesinde görünecektir.
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

                {/* Step 3: Teknik Özellikler */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fuelType" className="flex items-center gap-2">
                          <Fuel className="w-4 h-4" />
                          Yakıt Tipi *
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
                      <Label htmlFor="seats">Koltuk Sayısı *</Label>
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
                      <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Araç hakkında ek bilgiler..."
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

                {/* Step 4: Fiyatlandırma */}
                {currentStep === 4 && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pricePerMinute">Dakika Fiyatı (₺) *</Label>
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
                        <Label htmlFor="pricePerHour">Saat Fiyatı (₺) *</Label>
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
                        <Label htmlFor="pricePerDay">Günlük Fiyat (₺) *</Label>
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
                      <Label htmlFor="pricePerKm">KM Başı Fiyat (₺) *</Label>
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
                        Araç kiralama süresi dışında yapılan her km için ücret
                      </p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <h4 className="font-medium">Tahmini Kazanç</h4>
                      <p className="text-sm text-muted-foreground">
                        Günlük {formData.pricePerDay || 0} ₺ fiyatla ayda ortalama 15 gün kiralama yaparsanız:{" "}
                        <span className="font-semibold text-primary">
                          {((parseFloat(formData.pricePerDay) || 0) * 15).toLocaleString("tr-TR")} ₺
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
                            Araç Ekle
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

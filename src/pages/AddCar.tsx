import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";

const carSchema = z.object({
  name: z.string().min(2, "Araç adı en az 2 karakter olmalıdır").max(100),
  type: z.enum(["compact", "sedan", "suv"]),
  pricePerMinute: z.number().min(0.1, "Fiyat 0'dan büyük olmalıdır"),
  pricePerHour: z.number().min(1, "Fiyat 0'dan büyük olmalıdır"),
  pricePerDay: z.number().min(10, "Fiyat 10'dan büyük olmalıdır"),
  pricePerKm: z.number().min(0, "KM başı fiyat 0'dan büyük veya eşit olmalıdır"),
  kmPackages: z.record(z.string(), z.number()).optional(),
  fuelType: z.enum(["Benzin", "Dizel", "Elektrik", "Hibrit"]),
  transmission: z.enum(["Manuel", "Otomatik"]),
  seats: z.number().min(2).max(9),
  city: z.string().min(2, "Lütfen geçerli bir il seçin"),
  location: z.string().min(3, "Lokasyon en az 3 karakter olmalıdır"),
  plateNumber: z.string().optional(),
  year: z.number().min(2010, "2010 ve üzeri model yılı araçlar kabul edilmektedir").max(new Date().getFullYear() + 1),
  description: z.string().max(500, "Açıklama en fazla 500 karakter olabilir").optional(),
  gpsDeviceId: z.string().optional(),
});

const AddCar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude: number | null; longitude: number | null }>({
    latitude: null,
    longitude: null,
  });

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
  
  const [formData, setFormData] = useState({
    name: "",
    type: "compact",
    pricePerMinute: "",
    pricePerHour: "",
    pricePerDay: "",
    pricePerKm: "",
    km50: "",
    km100: "",
    km200: "",
    km500: "",
    fuelType: "Benzin",
    transmission: "Otomatik",
    seats: "5",
    city: "",
    location: "",
    plateNumber: "",
    year: "",
    description: "",
    gpsDeviceId: "",
  });

  if (!user) {
    navigate("/auth");
    return null;
  }

  const reverseGeocode = async (latitude: number, longitude: number) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          "Accept-Language": "tr",
        },
      }
    );
    if (!response.ok) {
      throw new Error("Reverse geocode failed");
    }
    const data = await response.json();
    const address = data?.display_name as string | undefined;
    const city =
      data?.address?.city ||
      data?.address?.town ||
      data?.address?.state ||
      data?.address?.county;
    return { address, city };
  };

  const forwardGeocode = async (query: string) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
      {
        headers: {
          "Accept-Language": "tr",
        },
      }
    );
    if (!response.ok) {
      throw new Error("Forward geocode failed");
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const result = data[0];
    return {
      latitude: Number(result.lat),
      longitude: Number(result.lon),
    };
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Tarayıcınız konum desteği sunmuyor");
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setCoordinates({ latitude, longitude });
        try {
          const { address, city } = await reverseGeocode(latitude, longitude);
          if (address) {
            setFormData((prev) => ({ ...prev, location: address }));
          }
          if (city) {
            setFormData((prev) => ({ ...prev, city }));
          }
        } catch (error) {
          toast.error("Konum adresine çevrilemedi");
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
        toast.error("Konum alınamadı");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const kmPackages: Record<string, number> = {};
      if (formData.km50) kmPackages["50"] = parseFloat(formData.km50);
      if (formData.km100) kmPackages["100"] = parseFloat(formData.km100);
      if (formData.km200) kmPackages["200"] = parseFloat(formData.km200);
      if (formData.km500) kmPackages["500"] = parseFloat(formData.km500);

      const validatedData = carSchema.parse({
        name: formData.name,
        type: formData.type,
        pricePerMinute: parseFloat(formData.pricePerMinute),
        pricePerHour: parseFloat(formData.pricePerHour),
        pricePerDay: parseFloat(formData.pricePerDay),
        pricePerKm: parseFloat(formData.pricePerKm || "0"),
        kmPackages: Object.keys(kmPackages).length > 0 ? kmPackages : undefined,
        fuelType: formData.fuelType,
        transmission: formData.transmission,
        seats: parseInt(formData.seats),
        city: formData.city,
        location: formData.location,
        plateNumber: formData.plateNumber || undefined,
        year: formData.year ? parseInt(formData.year) : new Date().getFullYear(),
        description: formData.description || undefined,
        gpsDeviceId: formData.gpsDeviceId || undefined,
      });

      let latitude = coordinates.latitude;
      let longitude = coordinates.longitude;

      if (!latitude || !longitude) {
        try {
          const geoResult = await forwardGeocode(
            `${validatedData.location}, ${validatedData.city}, Türkiye`
          );
          if (geoResult) {
            latitude = geoResult.latitude;
            longitude = geoResult.longitude;
          }
        } catch (error) {
          console.warn("Geocode işlemi başarısız:", error);
        }
      }

      setLoading(true);

      const { error } = await supabase.from("cars").insert({
        owner_id: user.id,
        name: validatedData.name,
        type: validatedData.type,
        price_per_minute: validatedData.pricePerMinute,
        price_per_hour: validatedData.pricePerHour,
        price_per_day: validatedData.pricePerDay,
        price_per_km: validatedData.pricePerKm,
        km_packages: validatedData.kmPackages || {},
        fuel_type: validatedData.fuelType,
        transmission: validatedData.transmission,
        seats: validatedData.seats,
        location: validatedData.location,
        city: validatedData.city,
        plate_number: validatedData.plateNumber,
        year: validatedData.year,
        description: validatedData.description,
        gps_device_id: validatedData.gpsDeviceId,
        latitude,
        longitude,
        available: true,
      });

      if (error) {
        console.error("Araç ekleme hatası:", error);
        toast.error("Araç eklenirken bir hata oluştu");
        return;
      }

      toast.success("Araç başarıyla eklendi!");
      navigate("/my-cars");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Bir hata oluştu");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          <Link to="/my-cars" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Araçlarıma Dön
          </Link>

          <h1 className="text-4xl font-bold text-foreground mb-8">Yeni Araç Ekle</h1>

          <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Araç Adı *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="örn: Renault Clio"
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
                  <Label htmlFor="seats">Koltuk Sayısı *</Label>
                  <Input
                    id="seats"
                    type="number"
                    min="2"
                    max="9"
                    value={formData.seats}
                    onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fuelType">Yakıt Tipi *</Label>
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
                  placeholder="örn: 2.5"
                  required
                />
                <p className="text-sm text-muted-foreground">Araç kiralama süresi dışında yapılan her km için ücret</p>
              </div>

              <div className="space-y-4">
                <Label>KM Paketleri (Opsiyonel)</Label>
                <div className="grid sm:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="km50">50 KM Paketi (₺)</Label>
                    <Input
                      id="km50"
                      type="number"
                      step="1"
                      min="0"
                      value={formData.km50}
                      onChange={(e) => setFormData({ ...formData, km50: e.target.value })}
                      placeholder="örn: 50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="km100">100 KM Paketi (₺)</Label>
                    <Input
                      id="km100"
                      type="number"
                      step="1"
                      min="0"
                      value={formData.km100}
                      onChange={(e) => setFormData({ ...formData, km100: e.target.value })}
                      placeholder="örn: 90"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="km200">200 KM Paketi (₺)</Label>
                    <Input
                      id="km200"
                      type="number"
                      step="1"
                      min="0"
                      value={formData.km200}
                      onChange={(e) => setFormData({ ...formData, km200: e.target.value })}
                      placeholder="örn: 160"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="km500">500 KM Paketi (₺)</Label>
                    <Input
                      id="km500"
                      type="number"
                      step="1"
                      min="0"
                      value={formData.km500}
                      onChange={(e) => setFormData({ ...formData, km500: e.target.value })}
                      placeholder="örn: 350"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">KM paketleri ile kullanıcılara paket seçeneği sunun</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
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
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="location">Lokasyon *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDetectLocation}
                    disabled={geoLoading}
                  >
                    {geoLoading ? "Algılanıyor..." : "Konumu Algıla"}
                  </Button>
                </div>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="örn: Ortahisar, Trabzon"
                  required
                />
                {coordinates.latitude && coordinates.longitude && (
                  <p className="text-xs text-muted-foreground">
                    GPS: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plateNumber">Plaka</Label>
                  <Input
                    id="plateNumber"
                    value={formData.plateNumber}
                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                    placeholder="örn: 34 ABC 123"
                  />
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
                  <p className="text-sm text-muted-foreground">Minimum 2010 model</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gpsDeviceId">GPS Cihaz ID</Label>
                <Input
                  id="gpsDeviceId"
                  value={formData.gpsDeviceId}
                  onChange={(e) => setFormData({ ...formData, gpsDeviceId: e.target.value })}
                  placeholder="örn: GPS-12345"
                />
                <p className="text-sm text-muted-foreground">Araçta kurulan GPS takip cihazının kimlik numarası</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Araç hakkında ek bilgiler..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-sm text-muted-foreground">{formData.description.length}/500</p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Ekleniyor..." : "Araç Ekle"}
              </Button>
            </form>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AddCar;

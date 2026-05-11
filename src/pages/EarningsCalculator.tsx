import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";

const EarningsCalculator = () => {
  const [carType, setCarType] = useState<"compact" | "sedan" | "suv">("sedan");
  const [rentalDays, setRentalDays] = useState<number[]>([15]);
  const [pricePerDay, setPricePerDay] = useState<string>("500");
  const [pricePerHour, setPricePerHour] = useState<string>("50");
  const [pricePerKm, setPricePerKm] = useState<string>("5");
  const [avgKmPerRental, setAvgKmPerRental] = useState<string>("50");
  const [commission] = useState<number>(20); // 20% platform commission

  const calculateEarnings = () => {
    const days = rentalDays[0];
    const dailyRate = parseFloat(pricePerDay) || 0;
    const hourlyRate = parseFloat(pricePerHour) || 0;
    const kmRate = parseFloat(pricePerKm) || 0;
    const avgKm = parseFloat(avgKmPerRental) || 0;

    // Assume mix of rentals: 60% daily, 30% hourly (avg 4hrs), 10% distance-based
    const dailyRentals = days * 0.6;
    const hourlyRentals = days * 0.3;
    const distanceRentals = days * 0.1;

    const grossFromDaily = dailyRentals * dailyRate;
    const grossFromHourly = hourlyRentals * (hourlyRate * 4); // avg 4 hours
    const grossFromDistance = distanceRentals * (kmRate * avgKm);

    const grossMonthly = grossFromDaily + grossFromHourly + grossFromDistance;
    const commissionAmount = (grossMonthly * commission) / 100;
    const netMonthly = grossMonthly - commissionAmount;
    const netYearly = netMonthly * 12;

    return {
      grossMonthly: grossMonthly.toFixed(2),
      commissionAmount: commissionAmount.toFixed(2),
      netMonthly: netMonthly.toFixed(2),
      netYearly: netYearly.toFixed(2),
      rentalDays: days,
    };
  };

  const earnings = calculateEarnings();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 mt-20 mb-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Calculator className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-3">Kazanç Hesaplayıcı</h1>
            <p className="text-lg text-muted-foreground">
              Aracınızı kiralayarak ne kadar kazanabileceğinizi hesaplayın
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle>Araç ve Fiyatlandırma</CardTitle>
                <CardDescription>
                  Araç bilgilerinizi ve fiyatlandırmanızı girin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="carType">Araç Tipi</Label>
                  <Select value={carType} onValueChange={(value) => setCarType(value as "compact" | "sedan" | "suv")}>
                    <SelectTrigger id="carType">
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
                  <Label htmlFor="rentalDays">
                    Aylık Kiralama Gün Sayısı: {rentalDays[0]} gün
                  </Label>
                  <Slider
                    id="rentalDays"
                    min={1}
                    max={30}
                    step={1}
                    value={rentalDays}
                    onValueChange={setRentalDays}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerDay">Günlük Fiyat (₺)</Label>
                  <Input
                    id="pricePerDay"
                    type="number"
                    value={pricePerDay}
                    onChange={(e) => setPricePerDay(e.target.value)}
                    placeholder="500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerHour">Saatlik Fiyat (₺)</Label>
                  <Input
                    id="pricePerHour"
                    type="number"
                    value={pricePerHour}
                    onChange={(e) => setPricePerHour(e.target.value)}
                    placeholder="50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerKm">Kilometre Başı Fiyat (₺)</Label>
                  <Input
                    id="pricePerKm"
                    type="number"
                    value={pricePerKm}
                    onChange={(e) => setPricePerKm(e.target.value)}
                    placeholder="5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avgKm">Ortalama Km/Kiralama</Label>
                  <Input
                    id="avgKm"
                    type="number"
                    value={avgKmPerRental}
                    onChange={(e) => setAvgKmPerRental(e.target.value)}
                    placeholder="50"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Results Section */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Tahmini Kazançlar
                </CardTitle>
                <CardDescription>
                  Platform komisyonu: %{commission}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-background/60 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Brüt Aylık Gelir</p>
                    <p className="text-2xl font-bold">₺{earnings.grossMonthly}</p>
                  </div>

                  <div className="p-4 bg-background/60 rounded-lg border border-destructive/20">
                    <p className="text-sm text-muted-foreground mb-1">Platform Komisyonu</p>
                    <p className="text-xl font-semibold text-destructive">-₺{earnings.commissionAmount}</p>
                  </div>

                  <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                    <p className="text-sm font-medium mb-1">Net Aylık Kazanç</p>
                    <p className="text-3xl font-bold text-primary">₺{earnings.netMonthly}</p>
                  </div>

                  <div className="p-4 bg-background/60 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Net Yıllık Kazanç</p>
                    <p className="text-2xl font-bold text-green-600">₺{earnings.netYearly}</p>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ayda kiralama günü:</span>
                    <span className="font-medium">{earnings.rentalDays} gün</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Boş kalan günler:</span>
                    <span className="font-medium">{30 - earnings.rentalDays} gün</span>
                  </div>
                </div>

                <div className="pt-4">
                  <Button className="w-full" size="lg">
                    Aracımı Ekle
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Hesaplama Detayları</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                • Bu hesaplamalar tahminidir ve gerçek kazançlar değişebilir.
              </p>
              <p>
                • Hesaplamada %60 günlük, %30 saatlik (ort. 4 saat), %10 mesafe bazlı kiralama karışımı varsayılmıştır.
              </p>
              <p>
                • Platform komisyon oranı %{commission} olarak hesaplanmıştır.
              </p>
              <p>
                • Yakıt, bakım ve sigorta gibi işletme giderleri kazançtan düşülmemiştir.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
};

export default EarningsCalculator;

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import { Link } from "react-router-dom";

const carTypes = [
  {
    id: "compact",
    name: "Kompakt",
    description: "Şehir içi kullanım için ideal",
    pricePerDay: 400,
    pricePerHour: 40,
    pricePerKm: 4,
    features: {
      seats: 4,
      fuelEfficiency: "Yüksek",
      parkingEase: "Çok Kolay",
      luggage: "2 Büyük Valiz",
      insurance: "Temel",
      recommended: ["Şehir içi", "Kısa mesafe", "Ekonomik"]
    },
    monthlyEarnings: "8.000 - 12.000",
    yearlyEarnings: "96.000 - 144.000"
  },
  {
    id: "sedan",
    name: "Sedan",
    description: "Konfor ve ekonomi dengesi",
    pricePerDay: 600,
    pricePerHour: 60,
    pricePerKm: 6,
    features: {
      seats: 5,
      fuelEfficiency: "Orta",
      parkingEase: "Kolay",
      luggage: "3 Büyük Valiz",
      insurance: "Standart",
      recommended: ["Uzun yolculuk", "Aile", "İş seyahati"]
    },
    monthlyEarnings: "12.000 - 18.000",
    yearlyEarnings: "144.000 - 216.000"
  },
  {
    id: "suv",
    name: "SUV",
    description: "Geniş ve lüks araç",
    pricePerDay: 900,
    pricePerHour: 90,
    pricePerKm: 9,
    features: {
      seats: 7,
      fuelEfficiency: "Orta-Düşük",
      parkingEase: "Orta",
      luggage: "5 Büyük Valiz",
      insurance: "Premium",
      recommended: ["Büyük grup", "Arazi", "Lüks tercih"]
    },
    monthlyEarnings: "18.000 - 27.000",
    yearlyEarnings: "216.000 - 324.000"
  }
];

const CarComparison = () => {
  const [selectedCars, setSelectedCars] = useState<string[]>(["sedan", "suv"]);

  const toggleCar = (carId: string) => {
    if (selectedCars.includes(carId)) {
      if (selectedCars.length > 1) {
        setSelectedCars(selectedCars.filter(id => id !== carId));
      }
    } else {
      if (selectedCars.length < 3) {
        setSelectedCars([...selectedCars, carId]);
      }
    }
  };

  const comparedCars = carTypes.filter(car => selectedCars.includes(car.id));

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3">Araç Tipi Karşılaştırma</h1>
            <p className="text-lg text-muted-foreground mb-6">
              Farklı araç tiplerini karşılaştırın ve size en uygun olanı seçin
            </p>
            
            <div className="flex flex-wrap gap-3 justify-center mb-4">
              {carTypes.map(car => (
                <Button
                  key={car.id}
                  variant={selectedCars.includes(car.id) ? "default" : "outline"}
                  onClick={() => toggleCar(car.id)}
                  className="min-w-[120px]"
                >
                  {selectedCars.includes(car.id) && <Check className="w-4 h-4 mr-2" />}
                  {car.name}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedCars.length} araç seçildi (En fazla 3 araç karşılaştırabilirsiniz)
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comparedCars.map((car, index) => (
              <Card key={car.id} className={index === 1 ? "border-primary shadow-lg" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl mb-2">{car.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{car.description}</p>
                    </div>
                    {index === 1 && (
                      <Badge variant="default">Popüler</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Fiyatlandırma */}
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold text-sm text-muted-foreground">Kiralama Fiyatları</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Günlük:</span>
                        <span className="font-semibold">₺{car.pricePerDay}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Saatlik:</span>
                        <span className="font-semibold">₺{car.pricePerHour}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Km Başı:</span>
                        <span className="font-semibold">₺{car.pricePerKm}</span>
                      </div>
                    </div>
                  </div>

                  {/* Özellikler */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground">Araç Özellikleri</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Koltuk Sayısı:</span>
                        <Badge variant="secondary">{car.features.seats}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Yakıt Verimliliği:</span>
                        <Badge variant="secondary">{car.features.fuelEfficiency}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Park Kolaylığı:</span>
                        <Badge variant="secondary">{car.features.parkingEase}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Bagaj:</span>
                        <Badge variant="secondary">{car.features.luggage}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Sigorta:</span>
                        <Badge variant="secondary">{car.features.insurance}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Tahmini Kazanç */}
                  <div className="space-y-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <h3 className="font-semibold text-sm">Tahmini Kazanç</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Aylık:</span>
                        <span className="font-semibold text-primary">₺{car.monthlyEarnings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Yıllık:</span>
                        <span className="font-semibold text-primary">₺{car.yearlyEarnings}</span>
                      </div>
                    </div>
                  </div>

                  {/* Önerilen Kullanım */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground">Önerilen Kullanım</h3>
                    <div className="flex flex-wrap gap-2">
                      {car.features.recommended.map((rec, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {rec}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Link to="/earnings-calculator" className="block">
                    <Button className="w-full" variant={index === 1 ? "default" : "outline"}>
                      Detaylı Hesapla
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Karşılaştırma Notları</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Tahmini kazançlar, ayda 15 gün kiralama varsayımına dayalıdır</p>
              <p>• Gerçek kazançlar talep, sezon ve bölgeye göre değişiklik gösterebilir</p>
              <p>• Fiyatlar önerilmiş başlangıç fiyatlarıdır, kendi fiyatlandırmanızı yapabilirsiniz</p>
              <p>• Platform komisyonu (%20) kazanç tahminlerine dahil değildir</p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
};

export default CarComparison;

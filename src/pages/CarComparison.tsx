import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import { Link } from "react-router-dom";

const CAR_TYPE_IDS = ["compact", "sedan", "suv"] as const;
const CAR_PRICES: Record<(typeof CAR_TYPE_IDS)[number], { pricePerDay: number; pricePerHour: number; pricePerKm: number; seats: number }> = {
  compact: { pricePerDay: 400, pricePerHour: 40, pricePerKm: 4, seats: 4 },
  sedan: { pricePerDay: 600, pricePerHour: 60, pricePerKm: 6, seats: 5 },
  suv: { pricePerDay: 900, pricePerHour: 90, pricePerKm: 9, seats: 7 },
};

const CarComparison = () => {
  const { t } = useTranslation();
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

  const comparedCars = CAR_TYPE_IDS.filter(id => selectedCars.includes(id));
  const notes = t("comparison.notes", { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3">{t("comparison.title")}</h1>
            <p className="text-lg text-muted-foreground mb-6">
              {t("comparison.subtitle")}
            </p>
            
            <div className="flex flex-wrap gap-3 justify-center mb-4">
              {CAR_TYPE_IDS.map(carId => (
                <Button
                  key={carId}
                  variant={selectedCars.includes(carId) ? "default" : "outline"}
                  onClick={() => toggleCar(carId)}
                  className="min-w-[120px]"
                >
                  {selectedCars.includes(carId) && <Check className="w-4 h-4 mr-2" />}
                  {t(`comparison.types.${carId}.name`)}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("comparison.selectedCount", { count: selectedCars.length })}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comparedCars.map((carId, index) => {
              const prices = CAR_PRICES[carId];
              const recommended = t(`comparison.types.${carId}.recommended`, { returnObjects: true }) as string[];

              return (
                <Card key={carId} className={index === 1 ? "border-primary shadow-lg" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-2xl mb-2">{t(`comparison.types.${carId}.name`)}</CardTitle>
                        <p className="text-sm text-muted-foreground">{t(`comparison.types.${carId}.description`)}</p>
                      </div>
                      {index === 1 && (
                        <Badge variant="default">{t("comparison.popular")}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                      <h3 className="font-semibold text-sm text-muted-foreground">{t("comparison.rentalPrices")}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">{t("comparison.daily")}</span>
                          <span className="font-semibold">₺{prices.pricePerDay}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">{t("comparison.hourly")}</span>
                          <span className="font-semibold">₺{prices.pricePerHour}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">{t("comparison.perKm")}</span>
                          <span className="font-semibold">₺{prices.pricePerKm}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-muted-foreground">{t("comparison.vehicleFeatures")}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">{t("comparison.seatCount")}</span>
                          <Badge variant="secondary">{prices.seats}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">{t("comparison.fuelEfficiency")}</span>
                          <Badge variant="secondary">{t(`comparison.types.${carId}.fuelEfficiency`)}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">{t("comparison.parkingEase")}</span>
                          <Badge variant="secondary">{t(`comparison.types.${carId}.parkingEase`)}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">{t("comparison.luggage")}</span>
                          <Badge variant="secondary">{t(`comparison.types.${carId}.luggage`)}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">{t("comparison.insurance")}</span>
                          <Badge variant="secondary">{t(`comparison.types.${carId}.insurance`)}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <h3 className="font-semibold text-sm">{t("comparison.estimatedEarnings")}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">{t("comparison.monthly")}</span>
                          <span className="font-semibold text-primary">₺{t(`comparison.types.${carId}.monthlyEarnings`)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">{t("comparison.yearly")}</span>
                          <span className="font-semibold text-primary">₺{t(`comparison.types.${carId}.yearlyEarnings`)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-muted-foreground">{t("comparison.recommendedUse")}</h3>
                      <div className="flex flex-wrap gap-2">
                        {recommended.map((rec, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {rec}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Link to="/earnings-calculator" className="block">
                      <Button className="w-full" variant={index === 1 ? "default" : "outline"}>
                        {t("comparison.calculateDetail")}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>{t("comparison.notesTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              {notes.map((note, i) => (
                <p key={i}>• {note}</p>
              ))}
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

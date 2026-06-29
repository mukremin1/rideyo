import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Link } from "react-router-dom";

const EarningsCalculator = () => {
  const { t } = useTranslation();
  const [carType, setCarType] = useState<"compact" | "sedan" | "suv">("sedan");
  const [rentalDays, setRentalDays] = useState<number[]>([15]);
  const [pricePerDay, setPricePerDay] = useState<string>("500");
  const [pricePerHour, setPricePerHour] = useState<string>("50");
  const [pricePerKm, setPricePerKm] = useState<string>("5");
  const [avgKmPerRental, setAvgKmPerRental] = useState<string>("50");
  const [commission] = useState<number>(20);

  const calculateEarnings = () => {
    const days = rentalDays[0];
    const dailyRate = parseFloat(pricePerDay) || 0;
    const hourlyRate = parseFloat(pricePerHour) || 0;
    const kmRate = parseFloat(pricePerKm) || 0;
    const avgKm = parseFloat(avgKmPerRental) || 0;

    const dailyRentals = days * 0.6;
    const hourlyRentals = days * 0.3;
    const distanceRentals = days * 0.1;

    const grossFromDaily = dailyRentals * dailyRate;
    const grossFromHourly = hourlyRentals * (hourlyRate * 4);
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
  const details = t("owner.earnings.details", { returnObjects: true, rate: commission }) as string[];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 mt-20 mb-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Calculator className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-3">{t("owner.earnings.title")}</h1>
            <p className="text-lg text-muted-foreground">{t("owner.earnings.subtitle")}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("owner.earnings.pricingTitle")}</CardTitle>
                <CardDescription>{t("owner.earnings.pricingDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="carType">{t("owner.earnings.carType")}</Label>
                  <Select value={carType} onValueChange={(value) => setCarType(value as "compact" | "sedan" | "suv")}>
                    <SelectTrigger id="carType">
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
                  <Label htmlFor="rentalDays">
                    {t("owner.earnings.rentalDays", { count: rentalDays[0] })}
                  </Label>
                  <Slider id="rentalDays" min={1} max={30} step={1} value={rentalDays} onValueChange={setRentalDays} className="w-full" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerDay">{t("owner.earnings.pricePerDay")}</Label>
                  <Input id="pricePerDay" type="number" value={pricePerDay} onChange={(e) => setPricePerDay(e.target.value)} placeholder="500" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerHour">{t("owner.earnings.pricePerHour")}</Label>
                  <Input id="pricePerHour" type="number" value={pricePerHour} onChange={(e) => setPricePerHour(e.target.value)} placeholder="50" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerKm">{t("owner.earnings.pricePerKm")}</Label>
                  <Input id="pricePerKm" type="number" value={pricePerKm} onChange={(e) => setPricePerKm(e.target.value)} placeholder="5" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avgKm">{t("owner.earnings.avgKm")}</Label>
                  <Input id="avgKm" type="number" value={avgKmPerRental} onChange={(e) => setAvgKmPerRental(e.target.value)} placeholder="50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  {t("owner.earnings.resultsTitle")}
                </CardTitle>
                <CardDescription>{t("owner.earnings.commissionNote", { rate: commission })}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-background/60 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">{t("owner.earnings.grossMonthly")}</p>
                    <p className="text-2xl font-bold">₺{earnings.grossMonthly}</p>
                  </div>
                  <div className="p-4 bg-background/60 rounded-lg border border-destructive/20">
                    <p className="text-sm text-muted-foreground mb-1">{t("owner.earnings.platformCommission")}</p>
                    <p className="text-xl font-semibold text-destructive">-₺{earnings.commissionAmount}</p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                    <p className="text-sm font-medium mb-1">{t("owner.earnings.netMonthly")}</p>
                    <p className="text-3xl font-bold text-primary">₺{earnings.netMonthly}</p>
                  </div>
                  <div className="p-4 bg-background/60 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">{t("owner.earnings.netYearly")}</p>
                    <p className="text-2xl font-bold text-green-600">₺{earnings.netYearly}</p>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("owner.earnings.rentalDaysLabel")}</span>
                    <span className="font-medium">{t("owner.earnings.daysUnit", { count: earnings.rentalDays })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("owner.earnings.idleDaysLabel")}</span>
                    <span className="font-medium">{t("owner.earnings.daysUnit", { count: 30 - earnings.rentalDays })}</span>
                  </div>
                </div>

                <div className="pt-4">
                  <Button className="w-full" size="lg" asChild>
                    <Link to="/add-car">{t("owner.earnings.addMyCar")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">{t("owner.earnings.detailsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              {details.map((line) => (
                <p key={line}>• {line}</p>
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

export default EarningsCalculator;

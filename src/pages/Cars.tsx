import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CarCard from "@/components/CarCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fetchAllowedRegions } from "@/lib/allowedRegions";
import { Car as CarType } from "@/types/car";
import carCompact from "@/assets/car-compact.jpg";
import carSedan from "@/assets/car-sedan.jpg";
import carSuv from "@/assets/car-suv.jpg";

const Cars = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const rentalFilter = searchParams.get("rental");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [cars, setCars] = useState<CarType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCars();

    const channel = supabase
      .channel("cars-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cars" },
        () => fetchCars()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCars = async () => {
    try {
      const [regionsResult, carsResult] = await Promise.all([
        fetchAllowedRegions().catch(() => []),
        supabase
          .from("cars")
          .select("*")
          .eq("available", true)
          .order("created_at", { ascending: false }),
      ]);

      const { data, error } = carsResult;
      if (error) {
        console.error("Araçlar yüklenirken hata:", error);
        toast.error(t("cars.loadError"));
        return;
      }

      const strictRegions = regionsResult.some((r) => r.is_active);
      const activeRegionIds = new Set(regionsResult.filter((r) => r.is_active).map((r) => r.id));
      const rows = strictRegions
        ? (data ?? []).filter(
            (car) => car.allowed_region_id && activeRegionIds.has(car.allowed_region_id),
          )
        : (data ?? []);

      const convertedCars: CarType[] = rows.map((car) => {
        let image = carCompact;
        if (car.type === "sedan") image = carSedan;
        if (car.type === "suv") image = carSuv;

        return {
          id: car.id,
          name: car.name,
          type: car.type as "compact" | "sedan" | "suv",
          pricePerMinute: Number(car.price_per_minute),
          pricePerHour: Number(car.price_per_hour),
          pricePerDay: Number(car.price_per_day),
          pricePerKm: Number(car.price_per_km || 0),
          kmPackages: (car.km_packages as Record<string, number>) || {},
          image: car.image_url || image,
          fuelType: car.fuel_type as "Benzin" | "Dizel" | "Elektrik" | "Hibrit",
          transmission: car.transmission as "Manuel" | "Otomatik",
          seats: car.seats,
          available: car.available,
          location: car.location,
        };
      });

      setCars(convertedCars);
    } catch (error) {
      console.error("Araçlar yüklenirken hata:", error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const filteredCars = cars.filter((car) => {
    const matchesSearch = car.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         car.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !selectedType || car.type === selectedType;
    return matchesSearch && matchesType;
  });

  const carTypes = ["compact", "sedan", "suv"] as const;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              {t("cars.title")}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t("cars.subtitle")}
            </p>
            {rentalFilter && ["minute", "hour", "day"].includes(rentalFilter) && (
              <div className="mt-4 inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                {t(`cars.rentalFilter.${rentalFilter}` as "cars.rentalFilter.minute")}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder={t("cars.searchPlaceholder")}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" className="sm:w-auto">
                <SlidersHorizontal className="w-5 h-5 mr-2" />
                {t("cars.filter")}
              </Button>
            </div>

            <div className="flex gap-2 mt-4 flex-wrap">
              <Button 
                variant={selectedType === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(null)}
              >
                {t("cars.all")}
              </Button>
              {carTypes.map((type) => (
                <Button 
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                >
                  {t(`cars.types.${type}`)}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">{t("common.loading")}</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    rentalType={rentalFilter && ["minute", "hour", "day"].includes(rentalFilter) ? rentalFilter : undefined}
                  />
                ))}
              </div>

              {filteredCars.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-xl text-muted-foreground">
                    {cars.length === 0 
                      ? t("cars.noCars") 
                      : t("cars.noResults")}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Cars;

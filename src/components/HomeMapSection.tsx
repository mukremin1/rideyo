import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, Navigation, ArrowRight, Fuel, ChevronRight, LocateFixed } from "lucide-react";
import CarsMap from "@/components/CarsMap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeolocation } from "@/contexts/GeolocationContext";
import { useNearbyCars } from "@/hooks/useNearbyCars";
import { cn } from "@/lib/utils";
import carCompact from "@/assets/car-compact.jpg";
import carSedan from "@/assets/car-sedan.jpg";
import carSuv from "@/assets/car-suv.jpg";

const getCarImage = (type: string, imageUrl: string | null): string => {
  if (imageUrl) return imageUrl;
  switch (type) {
    case "sedan":
      return carSedan;
    case "suv":
      return carSuv;
    default:
      return carCompact;
  }
};

const HomeMapSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);

  const {
    latitude,
    longitude,
    loading: locationLoading,
    error: locationError,
    requestPermission,
  } = useGeolocation();

  const userLocation = latitude && longitude ? { latitude, longitude } : null;
  const { cars, loading: carsLoading } = useNearbyCars(latitude, longitude, locationLoading, {
    maxDistance: 100,
    limit: 12,
  });

  const activeCarId = selectedCarId ?? cars[0]?.id ?? null;

  const handleRent = () => {
    if (activeCarId) navigate(`/car/${activeCarId}`);
    else navigate("/cars");
  };

  return (
    <section className="border-y border-border/50 bg-muted/30 px-4 py-7 sm:px-6 sm:py-9">
      <div className="container mx-auto">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 max-w-xl">
            <p className="section-eyebrow">{t("home.mapEyebrow")}</p>
            <h2 className="section-title mt-2 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <MapPin className="h-4 w-4 text-primary" />
              </span>
              {t("home.mapTitle")}
            </h2>
            <p className="section-subtitle">{t("home.mapDesc")}</p>
          </div>
          {userLocation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void requestPermission()}
              disabled={locationLoading}
              className="h-9 shrink-0 rounded-lg border-border/80 bg-background/80 text-xs font-medium shadow-sm backdrop-blur-sm"
            >
              <LocateFixed className="mr-2 h-3.5 w-3.5" />
              {t("home.locateMe")}
            </Button>
          )}
        </div>

        {!userLocation && !locationLoading && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/15 bg-primary/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {locationError ?? t("home.locationPromptTitle")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t("home.locationPromptDesc")}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => void requestPermission()}
              disabled={locationLoading}
              className="h-10 shrink-0 rounded-lg px-5 font-semibold"
            >
              <LocateFixed className="mr-2 h-4 w-4" />
              {t("home.enableLocation")}
            </Button>
          </div>
        )}

        <div className="surface-card-elevated overflow-hidden">
          <CarsMap
            userLocation={userLocation}
            showUserLocation={Boolean(userLocation)}
            height="min(360px, 44vh)"
            selectedCarId={activeCarId}
            onCarSelect={setSelectedCarId}
            className="rounded-none border-0"
          />
        </div>

        <div className="surface-card-elevated mt-5 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <Navigation className="h-4 w-4 text-primary" />
                {t("home.sheetTitle")}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {locationLoading
                  ? t("home.locating")
                  : cars.length > 0
                    ? t("home.nearbyCount", { count: cars.length })
                    : t("home.noCarsNearby")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/cars")}
            >
              {t("home.viewAllCars")}
              <ChevronRight className="ml-0.5 h-4 w-4" />
            </Button>
          </div>

          {(locationLoading || carsLoading) && (
            <div className="mb-4 flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[8.5rem] w-[12rem] shrink-0 rounded-xl" />
              ))}
            </div>
          )}

          {!locationLoading && !carsLoading && cars.length > 0 && (
            <div className="mb-4 flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory hide-scrollbar">
              {cars.map((car) => {
                const isSelected = activeCarId === car.id;
                return (
                  <button
                    key={car.id}
                    type="button"
                    onClick={() => setSelectedCarId(car.id)}
                    className={cn(
                      "w-[12rem] shrink-0 snap-start overflow-hidden rounded-xl border text-left transition-all duration-200",
                      isSelected
                        ? "border-primary/50 bg-primary/[0.03] shadow-[var(--shadow-soft)] ring-1 ring-primary/25"
                        : "border-border/70 bg-background hover:border-primary/30 hover:shadow-[var(--shadow-soft)]",
                    )}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                      <img
                        src={getCarImage(car.type, car.image_url)}
                        alt={car.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {car.distance !== undefined && (
                        <Badge className="absolute right-2 top-2 border-0 bg-background/95 px-2 py-0.5 text-[10px] font-medium shadow-sm">
                          {car.distance.toFixed(1)} km
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1.5 p-3">
                      <p className="truncate text-sm font-semibold tracking-tight">{car.name}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-[10px] font-medium capitalize text-muted-foreground">
                          <Fuel className="h-3 w-3" />
                          {car.fuel_type}
                        </span>
                        <span className="text-price text-sm">
                          {car.price_per_hour}₺
                          <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
                            {t("components.nearby.perHour")}
                          </span>
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <Button
            size="lg"
            className="h-12 w-full rounded-xl text-[0.9375rem] font-semibold tracking-tight shadow-[var(--shadow-soft)]"
            onClick={handleRent}
          >
            {activeCarId ? t("home.rentNow") : t("home.rentCar")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HomeMapSection;

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import GPSTracker from "@/components/GPSTracker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Info, Navigation, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { isRentalActive } from "@/lib/paymentStatus";

type TrackableCar = {
  id: string;
  name: string;
  city: string | null;
  plate_number: string | null;
  gps_device_id: string | null;
  latitude: number | null;
  longitude: number | null;
  last_gps_update: string | null;
  hasLiveGps: boolean;
  isRented: boolean;
};

const AdminGpsSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const [cars, setCars] = useState<TrackableCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchTrackableCars = useCallback(async () => {
    setLoading(true);
    try {
      const { data: carRows, error: carError } = await supabase
        .from("cars")
        .select("id, name, city, plate_number, gps_device_id, latitude, longitude, last_gps_update")
        .order("name");

      if (carError) throw carError;

      const { data: bookingRows, error: bookingError } = await supabase
        .from("bookings")
        .select("car_id, payment_status")
        .eq("payment_status", "in_progress");

      if (bookingError) throw bookingError;

      const rentedCarIds = new Set(
        (bookingRows ?? []).filter((b) => isRentalActive(b.payment_status)).map((b) => b.car_id),
      );

      const trackable = (carRows ?? [])
        .map((car) => {
          const hasLiveGps = Boolean(
            car.gps_device_id || (car.latitude != null && car.longitude != null),
          );
          const isRented = rentedCarIds.has(car.id);
          return { ...car, hasLiveGps, isRented };
        })
        .filter((car) => car.hasLiveGps || car.isRented);

      setCars(trackable);
    } catch {
      toast.error(t("admin.gpsTracking.loadError"));
      setCars([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (rolesLoading) return;
    if (!isAdmin) {
      navigate("/");
      return;
    }
    void fetchTrackableCars();
  }, [fetchTrackableCars, isAdmin, navigate, rolesLoading]);

  const filteredCars = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr");
    if (!q) return cars;
    return cars.filter(
      (car) =>
        car.name.toLocaleLowerCase("tr").includes(q) ||
        (car.city?.toLocaleLowerCase("tr").includes(q) ?? false) ||
        (car.plate_number?.toLocaleLowerCase("tr").includes(q) ?? false),
    );
  }, [cars, search]);

  const stats = useMemo(
    () => ({
      total: cars.length,
      live: cars.filter((c) => c.hasLiveGps).length,
      rented: cars.filter((c) => c.isRented).length,
    }),
    [cars],
  );

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold sm:text-2xl">{t("admin.gpsTracking.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.gpsTracking.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => void fetchTrackableCars()}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("admin.gpsTracking.refresh")}
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{t("admin.gpsTracking.info")}</AlertDescription>
      </Alert>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xl font-bold sm:text-2xl">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{t("admin.gpsTracking.statsTotal")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xl font-bold sm:text-2xl">{stats.live}</p>
            <p className="text-xs text-muted-foreground">{t("admin.gpsTracking.statsLive")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xl font-bold sm:text-2xl">{stats.rented}</p>
            <p className="text-xs text-muted-foreground">{t("admin.gpsTracking.statsRented")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative min-w-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t("admin.gpsTracking.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="py-10 text-center text-muted-foreground">{t("admin.gpsTracking.loading")}</p>
      ) : filteredCars.length === 0 ? (
        <Card className="p-10 text-center">
          <Navigation className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">{t("admin.gpsTracking.empty")}</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCars.map((car) => (
            <Card key={car.id} className="min-w-0 overflow-hidden">
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{car.name}</h3>
                  {car.isRented && (
                    <Badge className="bg-orange-600">{t("admin.gpsTracking.activeRental")}</Badge>
                  )}
                  {car.hasLiveGps ? (
                    <Badge variant="outline" className="gap-1">
                      <Navigation className="h-3 w-3" />
                      GPS
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{t("admin.gpsTracking.waitingGps")}</Badge>
                  )}
                </div>
                {(car.city || car.plate_number) && (
                  <p className="text-sm text-muted-foreground">
                    {[car.city, car.plate_number].filter(Boolean).join(" · ")}
                  </p>
                )}
                {car.hasLiveGps ? (
                  <GPSTracker carId={car.id} carName={car.name} />
                ) : (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    {t("admin.gpsTracking.noSignalYet")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminGpsSection;

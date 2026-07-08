import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Trash2, Users, Fuel, Settings, Navigation, AlertTriangle, Save } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  carHasGpsDevice,
  carHasRecentGpsSignal,
  getGpsSignalAgeMinutes,
} from "@/lib/carGps";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Car {
  id: string;
  name: string;
  type: string;
  price_per_minute: number;
  price_per_hour: number;
  price_per_day: number;
  price_per_km: number;
  km_packages: Record<string, number>;
  fuel_type: string;
  transmission: string;
  seats: number;
  available: boolean;
  location: string;
  plate_number: string | null;
  year: number | null;
  description: string | null;
  gps_device_id: string | null;
  last_gps_update: string | null;
}

const MyCars = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsDrafts, setGpsDrafts] = useState<Record<string, string>>({});
  const [savingGpsId, setSavingGpsId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchMyCars();
  }, [user, navigate]);

  const fetchMyCars = async () => {
    try {
      const { data, error } = await supabase
        .from("cars")
        .select("*")
        .eq("owner_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Cars load error:", error);
        toast.error(t("owner.myCars.toast.loadError"));
        return;
      }

      setCars((data || []) as Car[]);
      const drafts: Record<string, string> = {};
      for (const car of data ?? []) {
        drafts[car.id] = car.gps_device_id ?? "";
      }
      setGpsDrafts(drafts);
    } catch (error) {
      console.error("Cars load error:", error);
      toast.error(t("owner.common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (carId: string) => {
    try {
      const { error } = await supabase.from("cars").delete().eq("id", carId);

      if (error) {
        console.error("Delete error:", error);
        toast.error(t("owner.myCars.toast.deleteError"));
        return;
      }

      toast.success(t("owner.myCars.toast.deleteSuccess"));
      fetchMyCars();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(t("owner.common.error"));
    }
  };

  const toggleAvailability = async (carId: string, currentStatus: boolean) => {
    const car = cars.find((c) => c.id === carId);
    if (!currentStatus && car && !carHasGpsDevice(car)) {
      toast.error(t("owner.myCars.toast.gpsRequired"));
      return;
    }

    try {
      const { error } = await supabase
        .from("cars")
        .update({ available: !currentStatus })
        .eq("id", carId);

      if (error) {
        console.error("Status update error:", error);
        toast.error(t("owner.myCars.toast.statusError"));
        return;
      }

      toast.success(currentStatus ? t("owner.myCars.toast.disabled") : t("owner.myCars.toast.enabled"));
      fetchMyCars();
    } catch (error) {
      console.error("Status update error:", error);
      toast.error(t("owner.common.error"));
    }
  };

  const handleSaveGpsDevice = async (carId: string) => {
    const deviceId = gpsDrafts[carId]?.trim() ?? "";
    if (!deviceId) {
      toast.error(t("owner.myCars.gps.deviceRequired"));
      return;
    }

    setSavingGpsId(carId);
    try {
      const { error } = await supabase
        .from("cars")
        .update({ gps_device_id: deviceId })
        .eq("id", carId);

      if (error) throw error;

      toast.success(t("owner.myCars.gps.saveSuccess"));
      fetchMyCars();
    } catch (error) {
      console.error("GPS device save error:", error);
      toast.error(t("owner.myCars.gps.saveError"));
    } finally {
      setSavingGpsId(null);
    }
  };

  const carsWithoutGps = cars.filter((car) => !carHasGpsDevice(car)).length;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">{t("owner.myCars.title")}</h1>
              <p className="text-xl text-muted-foreground">{t("owner.myCars.subtitle")}</p>
            </div>
            <div className="flex gap-3">
              <Link to="/add-car">
                <Button size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  {t("owner.myCars.addCar")}
                </Button>
              </Link>
            </div>
          </div>

          {carsWithoutGps > 0 && (
            <Card className="mb-6 border-amber-500/40 bg-amber-500/10 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-100">
                    {t("owner.myCars.gps.bannerTitle", { count: carsWithoutGps })}
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                    {t("owner.myCars.gps.bannerDesc")}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {loading ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">{t("owner.common.loading")}</p>
            </div>
          ) : cars.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-foreground mb-4">{t("owner.myCars.emptyTitle")}</h2>
                <p className="text-muted-foreground mb-6">{t("owner.myCars.emptyDesc")}</p>
                <Link to="/add-car">
                  <Button size="lg">
                    <Plus className="w-5 h-5 mr-2" />
                    {t("owner.myCars.addFirstCar")}
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {cars.map((car) => {
                const hasGpsDevice = carHasGpsDevice(car);
                const hasLiveSignal = carHasRecentGpsSignal(car);
                const signalAgeMinutes = getGpsSignalAgeMinutes(car);

                return (
                <Card key={car.id} className="overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-1">{car.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{car.location}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={car.available ? "default" : "destructive"}>
                          {car.available ? t("owner.common.available") : t("owner.common.inUse")}
                        </Badge>
                        {hasGpsDevice ? (
                          <Badge variant="outline" className="gap-1">
                            <Navigation className="w-3 h-3" />
                            {hasLiveSignal
                              ? t("owner.myCars.gps.statusLive")
                              : t("owner.myCars.gps.statusLinked")}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {t("owner.myCars.gps.statusMissing")}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-4 mb-4 space-y-3">
                      <p className="text-sm font-semibold">{t("owner.myCars.gps.connectTitle")}</p>
                      <p className="text-xs text-muted-foreground">{t("owner.myCars.gps.connectDesc")}</p>
                      <Input
                        value={gpsDrafts[car.id] ?? ""}
                        onChange={(e) =>
                          setGpsDrafts((prev) => ({ ...prev, [car.id]: e.target.value }))
                        }
                        placeholder={t("owner.myCars.gps.devicePlaceholder")}
                      />
                      <Button
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => handleSaveGpsDevice(car.id)}
                        disabled={savingGpsId === car.id}
                      >
                        <Save className="w-4 h-4" />
                        {savingGpsId === car.id
                          ? t("owner.myCars.gps.saving")
                          : t("owner.myCars.gps.saveDevice")}
                      </Button>
                      {hasGpsDevice && !hasLiveSignal && (
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          {signalAgeMinutes != null
                            ? t("owner.myCars.gps.staleSignal", { minutes: signalAgeMinutes })
                            : t("owner.myCars.gps.noSignalYet")}
                        </p>
                      )}
                      {hasLiveSignal && (
                        <p className="text-xs text-green-700 dark:text-green-300">
                          {t("owner.myCars.gps.liveSignal")}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{t("owner.common.seats", { count: car.seats })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Fuel className="w-4 h-4" />
                        <span>{t(`owner.common.fuelTypes.${car.fuel_type}`, { defaultValue: car.fuel_type })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Settings className="w-4 h-4" />
                        <span>{t(`owner.common.transmission.${car.transmission}`, { defaultValue: car.transmission })}</span>
                      </div>
                    </div>

                    {car.plate_number && (
                      <div className="text-sm text-muted-foreground mb-4">
                        {t("owner.common.plate")}: <span className="font-semibold">{car.plate_number}</span>
                      </div>
                    )}

                    <div className="border-t border-border pt-4 mb-4">
                      <div className="text-2xl font-bold text-foreground mb-2">
                        {car.price_per_minute}₺
                        <span className="text-sm font-normal text-muted-foreground ml-1">{t("owner.common.perMin")}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {car.price_per_hour}₺{t("owner.common.perHour")} • {car.price_per_day}₺{t("owner.common.perDay")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("owner.common.perKm")}: <span className="font-semibold">{car.price_per_km}₺</span>
                      </div>
                      {car.km_packages && Object.keys(car.km_packages).length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {t("owner.common.kmPackages")}: {Object.entries(car.km_packages).map(([km, price]) => `${km}km=${price}₺`).join(", ")}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => toggleAvailability(car.id, car.available)}
                      >
                        {car.available ? t("owner.myCars.disableRental") : t("owner.myCars.enableRental")}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("owner.myCars.deleteTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("owner.myCars.deleteDesc", { name: car.name })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("owner.common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(car.id)}>
                              {t("owner.common.delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MyCars;

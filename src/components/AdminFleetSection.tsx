import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import GPSTracker from "@/components/GPSTracker";
import {
  Plus,
  MapPin,
  Car,
  RefreshCw,
  Search,
  ExternalLink,
  Navigation,
  Trash2,
  User,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { format, isWithinInterval, parseISO } from "date-fns";
import { useDateLocale } from "@/hooks/useDateLocale";
import { isBookingPaid } from "@/lib/paymentStatus";

type FleetCar = {
  id: string;
  name: string;
  type: string;
  plate_number: string | null;
  city: string | null;
  location: string;
  available: boolean | null;
  owner_id: string;
  price_per_hour: number;
  price_per_day: number;
  latitude: number | null;
  longitude: number | null;
  gps_device_id: string | null;
  last_gps_update: string | null;
  lock_status: string | null;
};

type OwnerProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

type ActiveBooking = {
  car_id: string;
  start_time: string;
  end_time: string;
};

type FleetFilter = "all" | "available" | "closed" | "rented" | "gps";

const AdminFleetSection = () => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [cars, setCars] = useState<FleetCar[]>([]);
  const [owners, setOwners] = useState<Record<string, OwnerProfile>>({});
  const [activeByCar, setActiveByCar] = useState<Record<string, ActiveBooking>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FleetFilter>("all");
  const [expandedGpsId, setExpandedGpsId] = useState<string | null>(null);

  const fetchCars = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cars")
      .select(
        "id, name, type, plate_number, city, location, available, owner_id, price_per_hour, price_per_day, latitude, longitude, gps_device_id, last_gps_update, lock_status",
      )
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(t("admin.fleet.loadError"));
      setLoading(false);
      return;
    }

    const list = (data ?? []) as FleetCar[];
    setCars(list);

    const ownerIds = [...new Set(list.map((c) => c.owner_id))];
    if (ownerIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", ownerIds);
      setOwners(Object.fromEntries((profiles ?? []).map((p) => [p.id, p])));
    } else {
      setOwners({});
    }

    const carIds = list.map((c) => c.id);
    if (carIds.length) {
      const now = new Date();
      const { data: bookings } = await supabase
        .from("bookings")
        .select("car_id, start_time, end_time, payment_status")
        .in("car_id", carIds);

      const active: Record<string, ActiveBooking> = {};
      for (const b of bookings ?? []) {
        if (!isBookingPaid(b.payment_status)) continue;
        const start = parseISO(b.start_time);
        const end = parseISO(b.end_time);
        if (isWithinInterval(now, { start, end })) {
          active[b.car_id] = b;
        }
      }
      setActiveByCar(active);
    } else {
      setActiveByCar({});
    }

    setLoading(false);
  }, [t]);

  useEffect(() => {
    void fetchCars();
  }, [fetchCars]);

  const stats = useMemo(() => {
    const total = cars.length;
    const available = cars.filter((c) => c.available).length;
    const rented = Object.keys(activeByCar).length;
    const withGps = cars.filter((c) => c.gps_device_id || (c.latitude && c.longitude)).length;
    return { total, available, closed: total - available, rented, withGps };
  }, [cars, activeByCar]);

  const filteredCars = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cars.filter((car) => {
      const owner = owners[car.owner_id];
      const ownerName = owner?.full_name?.toLowerCase() ?? "";
      const matchesSearch =
        !q ||
        car.name.toLowerCase().includes(q) ||
        (car.plate_number?.toLowerCase().includes(q) ?? false) ||
        (car.city?.toLowerCase().includes(q) ?? false) ||
        car.location.toLowerCase().includes(q) ||
        ownerName.includes(q);

      if (!matchesSearch) return false;

      const isRented = Boolean(activeByCar[car.id]);
      const hasGps = Boolean(car.gps_device_id || (car.latitude && car.longitude));

      if (filter === "available") return car.available && !isRented;
      if (filter === "closed") return !car.available;
      if (filter === "rented") return isRented;
      if (filter === "gps") return hasGps;
      return true;
    });
  }, [cars, owners, search, filter, activeByCar]);

  const toggleRental = async (car: FleetCar) => {
    const next = !car.available;
    setUpdatingId(car.id);
    const { error } = await supabase.from("cars").update({ available: next }).eq("id", car.id);
    setUpdatingId(null);
    if (error) {
      toast.error(t("admin.fleet.toggleError"));
      return;
    }
    toast.success(next ? t("admin.fleet.rentalOpened") : t("admin.fleet.rentalClosedToast"));
    setCars((prev) => prev.map((c) => (c.id === car.id ? { ...c, available: next } : c)));
  };

  const deleteCar = async (carId: string) => {
    setDeletingId(carId);
    const { error } = await supabase.from("cars").delete().eq("id", carId);
    setDeletingId(null);
    if (error) {
      toast.error(t("admin.fleet.deleteError"));
      return;
    }
    toast.success(t("admin.fleet.deleteSuccess"));
    setCars((prev) => prev.filter((c) => c.id !== carId));
    if (expandedGpsId === carId) setExpandedGpsId(null);
  };

  if (loading) {
    return <p className="text-muted-foreground py-8 text-center">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{t("admin.fleet.title")}</h2>
          <p className="text-muted-foreground">{t("admin.fleet.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void fetchCars()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("admin.fleet.refresh")}
          </Button>
          <Button asChild size="sm">
            <Link to="/add-car">
              <Plus className="w-4 h-4 mr-2" />
              {t("admin.fleet.addCar")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label={t("admin.fleet.statsTotal")} value={stats.total} />
        <StatCard label={t("admin.fleet.statsAvailable")} value={stats.available} />
        <StatCard label={t("admin.fleet.statsClosed")} value={stats.closed} />
        <StatCard label={t("admin.fleet.statsRented")} value={stats.rented} />
        <StatCard label={t("admin.fleet.statsGps")} value={stats.withGps} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("admin.fleet.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FleetFilter)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.fleet.filterAll")}</SelectItem>
            <SelectItem value="available">{t("admin.fleet.filterAvailable")}</SelectItem>
            <SelectItem value="rented">{t("admin.fleet.filterRented")}</SelectItem>
            <SelectItem value="closed">{t("admin.fleet.filterClosed")}</SelectItem>
            <SelectItem value="gps">{t("admin.fleet.filterGps")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredCars.length === 0 ? (
        <Card className="p-10 text-center">
          <Car className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">{t("admin.fleet.emptyFiltered")}</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCars.map((car) => {
            const owner = owners[car.owner_id];
            const active = activeByCar[car.id];
            const hasGps = Boolean(car.gps_device_id || (car.latitude && car.longitude));
            const gpsExpanded = expandedGpsId === car.id;

            return (
              <Card key={car.id} className="overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold">{car.name}</h3>
                        <Badge variant="outline">{t(`admin.carTypes.${car.type}`)}</Badge>
                        {active ? (
                          <Badge className="bg-orange-600">{t("admin.fleet.statusRented")}</Badge>
                        ) : car.available ? (
                          <Badge>{t("admin.fleet.rentalOpen")}</Badge>
                        ) : (
                          <Badge variant="secondary">{t("admin.fleet.rentalClosed")}</Badge>
                        )}
                        {hasGps && (
                          <Badge variant="outline" className="gap-1">
                            <Navigation className="w-3 h-3" />
                            GPS
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {car.city ? `${car.city} · ` : ""}
                        {car.location}
                      </p>

                      {car.plate_number && (
                        <p className="text-xs font-mono text-muted-foreground">{car.plate_number}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <User className="w-3.5 h-3.5" />
                          {owner?.full_name ?? t("admin.fleet.unknownOwner")}
                          {owner?.phone ? ` · ${owner.phone}` : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                          ₺{car.price_per_hour}/saat · ₺{car.price_per_day}/gün
                        </span>
                      </div>

                      {active && (
                        <p className="text-xs text-orange-700 dark:text-orange-300">
                          {t("admin.fleet.activeRental")}:{" "}
                          {format(parseISO(active.start_time), "d MMM HH:mm", { locale: dateLocale })}
                          {" – "}
                          {format(parseISO(active.end_time), "d MMM HH:mm", { locale: dateLocale })}
                        </p>
                      )}

                      {car.last_gps_update && (
                        <p className="text-xs text-muted-foreground">
                          {t("admin.fleet.lastGps")}:{" "}
                          {format(parseISO(car.last_gps_update), "d MMM yyyy HH:mm", { locale: dateLocale })}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={Boolean(car.available)}
                          disabled={updatingId === car.id}
                          onCheckedChange={() => void toggleRental(car)}
                        />
                        <span className="text-sm text-muted-foreground">{t("admin.fleet.rentalToggle")}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/car/${car.id}`}>
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            {t("admin.fleet.viewCar")}
                          </Link>
                        </Button>
                        {hasGps && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedGpsId(gpsExpanded ? null : car.id)}
                          >
                            <Navigation className="w-3.5 h-3.5 mr-1" />
                            {gpsExpanded ? t("admin.fleet.hideGps") : t("admin.fleet.trackGps")}
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={deletingId === car.id}>
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              {t("admin.fleet.delete")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("admin.fleet.deleteTitle")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("admin.fleet.deleteDesc", { name: car.name })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => void deleteCar(car.id)}>
                                {t("admin.fleet.delete")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>

                  {gpsExpanded && (
                    <div className="border-t pt-4">
                      <GPSTracker carId={car.id} carName={car.name} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

export default AdminFleetSection;

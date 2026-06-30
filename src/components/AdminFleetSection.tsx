import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, MapPin, Car } from "lucide-react";
import { toast } from "sonner";

type FleetCar = {
  id: string;
  name: string;
  type: string;
  plate_number: string | null;
  city: string | null;
  location: string;
  available: boolean | null;
  owner_id: string;
};

const AdminFleetSection = () => {
  const { t } = useTranslation();
  const [cars, setCars] = useState<FleetCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchCars = async () => {
    const { data, error } = await supabase
      .from("cars")
      .select("id, name, type, plate_number, city, location, available, owner_id")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(t("admin.fleet.loadError"));
      setLoading(false);
      return;
    }

    setCars((data ?? []) as FleetCar[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchCars();
  }, []);

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
        <Button asChild>
          <Link to="/add-car">
            <Plus className="w-4 h-4 mr-2" />
            {t("admin.fleet.addCar")}
          </Link>
        </Button>
      </div>

      {cars.length === 0 ? (
        <Card className="p-10 text-center">
          <Car className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">{t("admin.fleet.empty")}</p>
          <Button asChild>
            <Link to="/add-car">{t("admin.fleet.addCar")}</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {cars.map((car) => (
            <Card key={car.id} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{car.name}</h3>
                    <Badge variant="outline">{t(`admin.carTypes.${car.type}`)}</Badge>
                    {car.available ? (
                      <Badge>{t("admin.fleet.rentalOpen")}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("admin.fleet.rentalClosed")}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {car.city ? `${car.city} · ` : ""}
                    {car.location}
                  </p>
                  {car.plate_number && (
                    <p className="text-xs text-muted-foreground">{car.plate_number}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <LabelRow
                    label={t("admin.fleet.rentalToggle")}
                    checked={Boolean(car.available)}
                    disabled={updatingId === car.id}
                    onCheckedChange={() => void toggleRental(car)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

function LabelRow({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export default AdminFleetSection;

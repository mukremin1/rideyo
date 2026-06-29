import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GPSTracker from "@/components/GPSTracker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface Car {
  id: string;
  name: string;
  gps_device_id: string | null;
}

const GPSTracking = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCars = async () => {
      if (authLoading) return;
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("cars")
        .select("id, name, gps_device_id")
        .eq("owner_id", user.id)
        .not("gps_device_id", "is", null);

      if (!error && data) {
        setCars(data);
      }
      setLoading(false);
    };

    fetchCars();
  }, [user, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">{t("owner.gpsTracking.title")}</h1>
            <p className="text-muted-foreground">{t("owner.gpsTracking.subtitle")}</p>
          </div>

          <Alert className="mb-6">
            <Info className="w-4 h-4" />
            <AlertDescription>{t("owner.gpsTracking.info")}</AlertDescription>
          </Alert>

          {authLoading || loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("owner.gpsTracking.loadingCars")}</p>
            </div>
          ) : cars.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("owner.gpsTracking.noGpsCars")}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {cars.map((car) => (
                <GPSTracker key={car.id} carId={car.id} carName={car.name} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default GPSTracking;

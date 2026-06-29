import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { MapPin, Navigation, Zap, Clock } from "lucide-react";
import { format } from "date-fns";
import { useDateLocale } from "@/hooks/useDateLocale";

interface GPSTrackerProps {
  carId: string;
  carName: string;
}

interface GPSData {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  battery_level: number;
  last_gps_update: string;
}
interface CarRealtimePayload {
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  heading: number | null;
  battery_level: number | null;
  last_gps_update: string | null;
}

const GPSTracker = ({ carId, carName }: GPSTrackerProps) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [gpsData, setGpsData] = useState<GPSData | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const fetchGPSData = async () => {
      const { data } = await supabase
        .from("cars")
        .select("latitude, longitude, speed, heading, battery_level, last_gps_update")
        .eq("id", carId)
        .maybeSingle();

      if (data && data.latitude && data.longitude) {
        setGpsData(data as GPSData);

        const lastUpdate = new Date(data.last_gps_update || 0);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
        setIsOnline(diffMinutes < 5);
      }
    };

    fetchGPSData();

    const channel = supabase
      .channel(`gps-${carId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "cars",
          filter: `id=eq.${carId}`,
        },
        (payload) => {
          const newData = payload.new as CarRealtimePayload;
          if (newData.latitude && newData.longitude) {
            setGpsData({
              latitude: newData.latitude,
              longitude: newData.longitude,
              speed: newData.speed ?? 0,
              heading: newData.heading ?? 0,
              battery_level: newData.battery_level ?? 0,
              last_gps_update: newData.last_gps_update ?? new Date().toISOString(),
            });
            setIsOnline(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [carId]);

  if (!gpsData) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-5 h-5" />
          <span>{t("components.gpsTracker.waitingForData")}</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{carName}</h3>
          <Badge variant={isOnline ? "default" : "secondary"}>
            {isOnline ? t("components.gpsTracker.online") : t("components.gpsTracker.offline")}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{t("components.gpsTracker.location")}</span>
            </div>
            <p className="text-sm font-medium">
              {gpsData.latitude.toFixed(6)}, {gpsData.longitude.toFixed(6)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Navigation className="w-4 h-4" />
              <span>{t("components.gpsTracker.speed")}</span>
            </div>
            <p className="text-sm font-medium">
              {gpsData.speed.toFixed(0)} {t("components.gpsTracker.speedUnit")}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4" />
              <span>{t("components.gpsTracker.battery")}</span>
            </div>
            <p className="text-sm font-medium">%{gpsData.battery_level}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{t("components.gpsTracker.lastUpdate")}</span>
            </div>
            <p className="text-sm font-medium">
              {format(new Date(gpsData.last_gps_update), "HH:mm:ss", { locale: dateLocale })}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <a
            href={`https://www.google.com/maps?q=${gpsData.latitude},${gpsData.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {t("components.gpsTracker.viewOnMap")}
          </a>
        </div>
      </div>
    </Card>
  );
};

export default GPSTracker;

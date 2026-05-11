import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { MapPin, Navigation, Zap, Clock } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

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
  const [gpsData, setGpsData] = useState<GPSData | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Fetch initial GPS data
    const fetchGPSData = async () => {
      const { data } = await supabase
        .from("cars")
        .select("latitude, longitude, speed, heading, battery_level, last_gps_update")
        .eq("id", carId)
        .maybeSingle();

      if (data && data.latitude && data.longitude) {
        setGpsData(data as GPSData);
        
        // Check if car is online (updated within last 5 minutes)
        const lastUpdate = new Date(data.last_gps_update || 0);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
        setIsOnline(diffMinutes < 5);
      }
    };

    fetchGPSData();

    // Subscribe to real-time GPS updates
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
          <span>GPS verisi bekleniyor...</span>
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
            {isOnline ? "Çevrimiçi" : "Çevrimdışı"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Konum</span>
            </div>
            <p className="text-sm font-medium">
              {gpsData.latitude.toFixed(6)}, {gpsData.longitude.toFixed(6)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Navigation className="w-4 h-4" />
              <span>Hız</span>
            </div>
            <p className="text-sm font-medium">{gpsData.speed.toFixed(0)} km/s</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4" />
              <span>Batarya</span>
            </div>
            <p className="text-sm font-medium">%{gpsData.battery_level}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Son Güncelleme</span>
            </div>
            <p className="text-sm font-medium">
              {format(new Date(gpsData.last_gps_update), "HH:mm:ss", { locale: tr })}
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
            Haritada Görüntüle →
          </a>
        </div>
      </div>
    </Card>
  );
};

export default GPSTracker;

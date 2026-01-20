// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { useNavigate } from "react-router-dom";
import { MapPin, Fuel } from "lucide-react";
import { resolveCoordinatesFromLocation, type LatLngTuple } from "@/lib/locationGeocoding";

// Fix for default marker icon
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom car icon
const carIcon = L.divIcon({
  className: "car-marker",
  html: `<div style="background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
      <circle cx="7" cy="17" r="2"/>
      <path d="M9 17h6"/>
      <circle cx="17" cy="17" r="2"/>
    </svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// User location icon
const userIcon = L.divIcon({
  className: "user-marker",
  html: `<div style="background: hsl(220, 90%, 56%); width: 20px; height: 20px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface CarLocation {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  location: string;
  type: string;
  price_per_hour: number;
  fuel_type: string;
  available: boolean;
}

interface CarsMapProps {
  userLocation?: { latitude: number; longitude: number } | null;
  showUserLocation?: boolean;
  height?: string;
  onCarSelect?: (carId: string) => void;
}

const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
};

const CarsMap = ({ userLocation, showUserLocation = true, height = "400px", onCarSelect }: CarsMapProps) => {
  const [cars, setCars] = useState<CarLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [derivedCoords, setDerivedCoords] = useState<Record<string, LatLngTuple>>({});
  const navigate = useNavigate();

  const defaultCenter: [number, number] = [39.9334, 32.8597];
  const mapCenter: [number, number] = userLocation ? [userLocation.latitude, userLocation.longitude] : defaultCenter;

  useEffect(() => {
    const fetchCars = async () => {
      const { data, error } = await supabase
        .from("cars")
        .select("id, name, latitude, longitude, location, type, price_per_hour, fuel_type, available")
        .eq("available", true);

      if (!error && data) setCars(data);
      setLoading(false);
    };

    fetchCars();

    const channel = supabase
      .channel("cars-location")
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

  useEffect(() => {
    let cancelled = false;

    const resolveMissing = async () => {
      const missing = cars.filter((c) => (!c.latitude || !c.longitude) && !!c.location);

      await Promise.all(
        missing.map(async (car) => {
          if (derivedCoords[car.id]) return;
          const coords = await resolveCoordinatesFromLocation(car.location);
          if (!coords || cancelled) return;
          setDerivedCoords((prev) => ({ ...prev, [car.id]: coords }));
        })
      );
    };

    resolveMissing();
    return () => {
      cancelled = true;
    };
  }, [cars, derivedCoords]);

  const markers = useMemo(() => {
    return cars
      .map((car) => {
        let position: LatLngTuple | null = null;

        if (car.latitude && car.longitude) position = [car.latitude, car.longitude];
        else if (derivedCoords[car.id]) position = derivedCoords[car.id];

        if (!position) return null;
        return { car, position };
      })
      .filter(Boolean) as Array<{ car: CarLocation; position: LatLngTuple }>;
  }, [cars, derivedCoords]);

  const handleCarClick = (carId: string) => {
    if (onCarSelect) onCarSelect(carId);
    else navigate(`/car/${carId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-muted rounded-lg" style={{ height }}>
        <div className="text-muted-foreground">Harita yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-border" style={{ height }}>
      <MapContainer center={mapCenter} zoom={userLocation ? 13 : 6} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && <MapController center={mapCenter} />}

        {showUserLocation && userLocation && (
          <>
            <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
              <Popup>
                <div className="text-center p-2">
                  <MapPin className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <p className="font-semibold">Konumunuz</p>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[userLocation.latitude, userLocation.longitude]}
              radius={2000}
              pathOptions={{ color: "hsl(220, 90%, 56%)", fillColor: "hsl(220, 90%, 56%)", fillOpacity: 0.1 }}
            />
          </>
        )}

        {markers.map(({ car, position }) => (
          <Marker key={car.id} position={position} icon={carIcon}>
            <Popup>
              <Card className="border-0 shadow-none p-0 min-w-[200px]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{car.name}</h3>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {car.type}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{car.location}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Fuel className="w-3 h-3" />
                    <span>{car.fuel_type}</span>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="font-bold text-primary">{car.price_per_hour}₺/saat</span>
                    <Button size="sm" onClick={() => handleCarClick(car.id)} className="text-xs h-7">
                      Kirala
                    </Button>
                  </div>
                </div>
              </Card>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default CarsMap;

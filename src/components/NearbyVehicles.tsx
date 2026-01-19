import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { MapPin, Navigation, AlertCircle, Car } from "lucide-react";
import { useNavigate } from "react-router-dom";
import carCompact from "@/assets/car-compact.jpg";
import carSedan from "@/assets/car-sedan.jpg";
import carSuv from "@/assets/car-suv.jpg";

interface NearbyCarData {
  id: string;
  name: string;
  type: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  price_per_hour: number;
  fuel_type: string;
  image_url: string | null;
  distance?: number;
}

interface NearbyVehiclesProps {
  maxDistance?: number; // in km
  limit?: number;
}

const NearbyVehicles = ({ maxDistance = 50, limit = 6 }: NearbyVehiclesProps) => {
  const [cars, setCars] = useState<NearbyCarData[]>([]);
  const [loading, setLoading] = useState(true);
  const { latitude, longitude, loading: locationLoading, error: locationError, requestPermission } = useGeolocation();
  const navigate = useNavigate();

  // Istanbul districts with accurate coordinates
  const istanbulDistricts: Record<string, [number, number]> = {
    sancaktepe: [41.0028, 29.2341],
    pendik: [40.8756, 29.2339],
    kartal: [40.8899, 29.1856],
    maltepe: [40.9345, 29.1306],
    kadikoy: [40.9927, 29.0259],
    uskudar: [41.0234, 29.0153],
    beykoz: [41.1323, 29.1017],
    umraniye: [41.0162, 29.1244],
    atasehir: [40.9833, 29.1167],
    sultanbeyli: [40.9614, 29.2617],
    tuzla: [40.8167, 29.3],
    cekmekoy: [41.0333, 29.1833],
    sile: [41.1761, 29.6128],
    beylikduzu: [40.9833, 28.6333],
    esenyurt: [41.0333, 28.6833],
    avcilar: [40.9833, 28.7167],
    bakirkoy: [40.9833, 28.8667],
    bahcelievler: [41.0, 28.85],
    bagcilar: [41.0333, 28.85],
    kucukcekmece: [41.0, 28.7667],
    buyukcekmece: [41.0167, 28.5833],
    basaksehir: [41.0833, 28.8],
    arnavutkoy: [41.2, 28.75],
    eyupsultan: [41.0833, 28.9333],
    gaziosmanpasa: [41.0667, 28.9167],
    sultangazi: [41.1, 28.85],
    kagithane: [41.0833, 28.9667],
    sisli: [41.0667, 28.9833],
    beyoglu: [41.0333, 28.9833],
    fatih: [41.0167, 28.95],
    zeytinburnu: [41.0, 28.9],
    gungoren: [41.0167, 28.8833],
    esenler: [41.05, 28.8833],
    bayrampasa: [41.05, 28.9167],
    besiktas: [41.05, 29.0],
    sariyer: [41.1667, 29.05],
  };

  // City center coordinates as fallback
  const cityCoordinates: Record<string, [number, number]> = {
    istanbul: [41.0082, 28.9784],
    ankara: [39.9334, 32.8597],
    izmir: [38.4237, 27.1428],
    bursa: [40.1826, 29.0669],
    antalya: [36.8969, 30.7133],
    trabzon: [41.0027, 39.7168],
    erzurum: [39.9055, 41.2659],
    konya: [37.8667, 32.4833],
    adana: [37.0, 35.3213],
    mersin: [36.8, 34.6333],
    samsun: [41.2867, 36.33],
    kayseri: [38.7312, 35.4787],
    eskisehir: [39.7667, 30.5256],
    gaziantep: [37.0662, 37.3833],
    diyarbakir: [37.9144, 40.2306],
  };

  const getCoordinatesFromLocation = (location: string): [number, number] | null => {
    const lowerLocation = location.toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');

    // Check Istanbul districts first
    for (const [district, coords] of Object.entries(istanbulDistricts)) {
      if (lowerLocation.includes(district)) {
        return coords;
      }
    }

    // Fallback to city centers
    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (lowerLocation.includes(city)) {
        return coords;
      }
    }
    return null;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };

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

  useEffect(() => {
    const fetchCars = async () => {
      const { data, error } = await supabase
        .from("cars")
        .select("id, name, type, location, latitude, longitude, price_per_hour, fuel_type, image_url")
        .eq("available", true);

      if (error) {
        console.error("Error fetching cars:", error);
        setLoading(false);
        return;
      }

      if (data && latitude !== null && longitude !== null) {
        // Calculate distances and filter
        const carsWithDistance = data
          .map((car) => {
            let carLat = car.latitude;
            let carLon = car.longitude;

            // If no coordinates, try to get from location text
            if (!carLat || !carLon) {
              const coords = getCoordinatesFromLocation(car.location);
              if (coords) {
                [carLat, carLon] = coords;
              }
            }

            if (carLat && carLon) {
              const distance = calculateDistance(latitude, longitude, carLat, carLon);
              return { ...car, distance };
            }
            return { ...car, distance: undefined };
          })
          .filter((car) => car.distance !== undefined && car.distance <= maxDistance)
          .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
          .slice(0, limit);

        setCars(carsWithDistance);
      } else if (data) {
        // No user location, just show all cars
        setCars(data.slice(0, limit));
      }

      setLoading(false);
    };

    if (!locationLoading) {
      fetchCars();
    }
  }, [latitude, longitude, locationLoading, maxDistance, limit]);

  if (locationLoading || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Yakındaki Araçlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (locationError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Yakındaki Araçlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{locationError}</p>
            <Button onClick={requestPermission} variant="outline">
              <MapPin className="w-4 h-4 mr-2" />
              Konum İzni Ver
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cars.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Yakındaki Araçlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Yakınınızda müsait araç bulunamadı. Tüm araçları görüntüleyin.
            </p>
            <Button onClick={() => navigate("/cars")} className="mt-4">
              Tüm Araçlar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Yakındaki Araçlar
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/cars")}>
            Tümünü Gör →
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cars.map((car) => (
            <div
              key={car.id}
              className="group cursor-pointer rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-all"
              onClick={() => navigate(`/car/${car.id}`)}
            >
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={getCarImage(car.type, car.image_url)}
                  alt={car.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {car.distance !== undefined && (
                  <Badge className="absolute top-2 right-2 bg-background/90">
                    <MapPin className="w-3 h-3 mr-1" />
                    {car.distance.toFixed(1)} km
                  </Badge>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm truncate">{car.name}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{car.location}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{car.fuel_type}</span>
                  <span className="font-bold text-primary text-sm">{car.price_per_hour}₺/saat</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default NearbyVehicles;

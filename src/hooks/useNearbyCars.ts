import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveCoordinatesFromLocation } from "@/lib/locationGeocoding";

export interface NearbyCar {
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

const deg2rad = (deg: number): number => deg * (Math.PI / 180);

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export function useNearbyCars(
  latitude: number | null,
  longitude: number | null,
  locationLoading: boolean,
  options: { maxDistance?: number; limit?: number } = {},
) {
  const { maxDistance = 50, limit = 12 } = options;
  const [cars, setCars] = useState<NearbyCar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCars = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("cars")
        .select("id, name, type, location, latitude, longitude, price_per_hour, fuel_type, image_url")
        .eq("available", true);

      if (error) {
        console.error("Error fetching cars:", error);
        setCars([]);
        setLoading(false);
        return;
      }

      if (data && latitude !== null && longitude !== null) {
        const carsWithDistance = await Promise.all(
          data.map(async (car) => {
            let carLat = car.latitude;
            let carLon = car.longitude;

            if (!carLat || !carLon) {
              const coords = await resolveCoordinatesFromLocation(car.location);
              if (coords) {
                [carLat, carLon] = coords;
              }
            }

            if (carLat && carLon) {
              const distance = calculateDistance(latitude, longitude, carLat, carLon);
              return { ...car, distance };
            }

            return { ...car, distance: undefined };
          }),
        );

        setCars(
          carsWithDistance
            .filter((c) => c.distance !== undefined && (c.distance as number) <= maxDistance)
            .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
            .slice(0, limit),
        );
      } else if (data) {
        setCars(data.slice(0, limit));
      } else {
        setCars([]);
      }

      setLoading(false);
    };

    if (!locationLoading) {
      fetchCars();
    }
  }, [latitude, longitude, locationLoading, maxDistance, limit]);

  return { cars, loading };
}

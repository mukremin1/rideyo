import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CarCard from "@/components/CarCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Car as CarType } from "@/types/car";
import carCompact from "@/assets/car-compact.jpg";
import carSedan from "@/assets/car-sedan.jpg";
import carSuv from "@/assets/car-suv.jpg";
interface FavoriteRow {
  car_id: string;
  cars: {
    id: string;
    name: string;
    type: string;
    price_per_minute: number;
    price_per_hour: number;
    price_per_day: number;
    price_per_km: number | null;
    km_packages: Record<string, number> | null;
    image_url: string | null;
    fuel_type: string;
    transmission: string;
    seats: number;
    available: boolean;
    location: string;
  } | null;
}

const Favorites = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cars, setCars] = useState<CarType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const { data: favorites, error } = await supabase
        .from("favorites")
        .select(`
          car_id,
          cars (*)
        `)
        .eq("user_id", user?.id);

      if (error) throw error;

      const convertedCars: CarType[] = ((favorites || []) as FavoriteRow[]).flatMap((fav) => {
        const car = fav.cars;
        if (!car) return [];
        let image = carCompact;
        if (car.type === "sedan") image = carSedan;
        if (car.type === "suv") image = carSuv;

        return {
          id: car.id,
          name: car.name,
          type: car.type as "compact" | "sedan" | "suv",
          pricePerMinute: Number(car.price_per_minute),
          pricePerHour: Number(car.price_per_hour),
          pricePerDay: Number(car.price_per_day),
          pricePerKm: Number(car.price_per_km || 0),
          kmPackages: (car.km_packages as Record<string, number>) || {},
          image: car.image_url || image,
          fuelType: car.fuel_type as "Benzin" | "Dizel" | "Elektrik" | "Hibrit",
          transmission: car.transmission as "Manuel" | "Otomatik",
          seats: car.seats,
          available: car.available,
          location: car.location,
        };
      });

      setCars(convertedCars);
    } catch (error) {
      console.error("Favoriler yüklenemedi:", error);
      toast.error("Favoriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Favorilerim</h1>
            <p className="text-muted-foreground">Beğendiğiniz araçlar</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">Yükleniyor...</p>
            </div>
          ) : cars.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">Henüz favori araç eklemediniz</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {cars.map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Favorites;

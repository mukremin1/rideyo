import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CarCard from "@/components/CarCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Car as CarType } from "@/types/car";
import carCompact from "@/assets/car-compact.jpg";
import carSedan from "@/assets/car-sedan.jpg";
import carSuv from "@/assets/car-suv.jpg";

const Cars = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [cars, setCars] = useState<CarType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCars();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("cars-updates")
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

  const fetchCars = async () => {
    try {
      const { data, error } = await supabase
        .from("cars")
        .select("*")
        .eq("available", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Araçlar yüklenirken hata:", error);
        toast.error("Araçlar yüklenemedi");
        return;
      }

      // Convert database format to component format
      const convertedCars: CarType[] = (data || []).map((car) => {
        // Select image based on car type
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
      console.error("Araçlar yüklenirken hata:", error);
      toast.error("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const filteredCars = cars.filter((car) => {
    const matchesSearch = car.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         car.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !selectedType || car.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Müsait Araçlar
            </h1>
            <p className="text-xl text-muted-foreground">
              Yakınındaki araçları keşfet ve hemen kirala
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="Araç veya lokasyon ara..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" className="sm:w-auto">
                <SlidersHorizontal className="w-5 h-5 mr-2" />
                Filtrele
              </Button>
            </div>

            <div className="flex gap-2 mt-4 flex-wrap">
              <Button 
                variant={selectedType === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(null)}
              >
                Tümü
              </Button>
              <Button 
                variant={selectedType === "compact" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("compact")}
              >
                Kompakt
              </Button>
              <Button 
                variant={selectedType === "sedan" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("sedan")}
              >
                Sedan
              </Button>
              <Button 
                variant={selectedType === "suv" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType("suv")}
              >
                SUV
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">Yükleniyor...</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCars.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>

              {filteredCars.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-xl text-muted-foreground">
                    {cars.length === 0 
                      ? "Henüz eklenmiş araç bulunmuyor" 
                      : "Aramanıza uygun araç bulunamadı"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Cars;

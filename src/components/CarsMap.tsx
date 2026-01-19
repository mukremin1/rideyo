// @ts-nocheck
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { useNavigate } from "react-router-dom";
import { Car, MapPin, Navigation, Fuel } from "lucide-react";

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

// Component to update map view when user location changes
const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
};

const CarsMap = ({
  userLocation,
  showUserLocation = true,
  height = "400px",
  onCarSelect,
}: CarsMapProps) => {
  const [cars, setCars] = useState<CarLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Default center (Turkey)
  const defaultCenter: [number, number] = [39.9334, 32.8597];
  const mapCenter: [number, number] = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : defaultCenter;

  useEffect(() => {
    const fetchCars = async () => {
      const { data, error } = await supabase
        .from("cars")
        .select("id, name, latitude, longitude, location, type, price_per_hour, fuel_type, available")
        .eq("available", true);

      if (!error && data) {
        setCars(data);
      }
      setLoading(false);
    };

    fetchCars();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("cars-location")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cars",
        },
        () => {
          fetchCars();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Convert location text to coordinates (geocoding with district support)
  const getCoordinatesFromLocation = (location: string): [number, number] | null => {
    // Istanbul districts with accurate coordinates
    const istanbulDistricts: Record<string, [number, number]> = {
      sancaktepe: [41.0028, 29.2341],
      pendik: [40.8756, 29.2339],
      kartal: [40.8899, 29.1856],
      maltepe: [40.9345, 29.1306],
      kadıkoy: [40.9927, 29.0259],
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
      avcılar: [40.9833, 28.7167],
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
      catalca: [41.1417, 28.4611],
      silivri: [41.0736, 28.2467],
      adalar: [40.8761, 29.0911],
    };

    // Ankara districts
    const ankaraDistricts: Record<string, [number, number]> = {
      cankaya: [39.9, 32.8667],
      kecioren: [40.0, 32.8667],
      mamak: [39.9333, 32.9167],
      etimesgut: [39.95, 32.6833],
      sincan: [39.9667, 32.5833],
      yenimahalle: [39.9667, 32.8],
      altindag: [39.95, 32.8833],
      pursaklar: [40.05, 32.9],
      akyurt: [40.1333, 33.0833],
      beypazari: [40.1667, 31.9167],
      cubuk: [40.2333, 33.0333],
      golbasi: [39.8, 32.8],
      haymana: [39.4333, 32.5],
      kahramankazan: [40.1167, 32.6833],
      kalecik: [40.1, 33.4167],
      kizilcahamam: [40.4667, 32.65],
      nallihan: [40.1833, 31.35],
      polatli: [39.5833, 32.1333],
      sereflikochisar: [38.9333, 33.5333],
      evren: [39.0167, 33.8],
      bala: [39.5667, 33.1167],
    };

    // İzmir districts
    const izmirDistricts: Record<string, [number, number]> = {
      konak: [38.4189, 27.1287],
      karsiyaka: [38.4565, 27.1116],
      bornova: [38.4667, 27.2167],
      buca: [38.3833, 27.1667],
      cigli: [38.5, 27.0667],
      bayrakli: [38.4667, 27.1667],
      gaziemir: [38.3167, 27.1333],
      karabaglar: [38.3833, 27.1167],
      narlidere: [38.4, 26.9667],
      balcova: [38.3833, 27.0333],
      guzelbahce: [38.3667, 26.9],
      cesme: [38.3167, 26.3],
      urla: [38.3167, 26.7667],
      seferihisar: [38.2, 26.8333],
      menderes: [38.25, 27.1333],
      torbali: [38.1667, 27.3667],
      bergama: [39.1167, 27.1833],
      odemis: [38.2167, 27.9667],
      tire: [38.0833, 27.7333],
      aliaga: [38.8, 26.9667],
    };

    // Bursa districts
    const bursaDistricts: Record<string, [number, number]> = {
      osmangazi: [40.1833, 29.0667],
      nilufer: [40.2167, 28.95],
      yildirim: [40.1833, 29.1],
      mudanya: [40.3833, 28.8833],
      gemlik: [40.4333, 29.1667],
      inegol: [40.0833, 29.5167],
      orhangazi: [40.4833, 29.3167],
      iznik: [40.4333, 29.7167],
      kestel: [40.2, 29.2167],
      gursu: [40.2333, 29.1833],
    };

    // Antalya districts  
    const antalyaDistricts: Record<string, [number, number]> = {
      muratpasa: [36.8833, 30.7],
      konyaalti: [36.8667, 30.6333],
      kepez: [36.95, 30.7333],
      aksu: [36.9333, 30.8333],
      dosemealti: [36.9667, 30.5833],
      alanya: [36.55, 32.0],
      manavgat: [36.7833, 31.4333],
      serik: [36.9167, 31.1],
      kemer: [36.6, 30.5667],
      kas: [36.2, 29.6333],
      finike: [36.3, 30.15],
      kumluca: [36.3667, 30.2833],
    };

    // Trabzon districts
    const trabzonDistricts: Record<string, [number, number]> = {
      ortahisar: [41.0027, 39.7168],
      akcaabat: [41.0167, 39.5667],
      yomra: [40.95, 39.85],
      arakli: [40.95, 40.0667],
      surmene: [40.9167, 40.1167],
      of: [40.95, 40.2667],
      vakfikebir: [41.05, 39.2833],
      besikduzu: [41.05, 39.2333],
      carsibasi: [41.05, 39.3833],
      macka: [40.8167, 39.6167],
      tonya: [40.9, 39.2833],
      hayrat: [40.9167, 40.4],
      dernekpazari: [40.85, 40.2833],
      koprubasi: [40.8, 40.5667],
    };

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

    // Check Ankara districts
    for (const [district, coords] of Object.entries(ankaraDistricts)) {
      if (lowerLocation.includes(district)) {
        return coords;
      }
    }

    // Check İzmir districts
    for (const [district, coords] of Object.entries(izmirDistricts)) {
      if (lowerLocation.includes(district)) {
        return coords;
      }
    }

    // Check Bursa districts
    for (const [district, coords] of Object.entries(bursaDistricts)) {
      if (lowerLocation.includes(district)) {
        return coords;
      }
    }

    // Check Antalya districts
    for (const [district, coords] of Object.entries(antalyaDistricts)) {
      if (lowerLocation.includes(district)) {
        return coords;
      }
    }

    // Check Trabzon districts
    for (const [district, coords] of Object.entries(trabzonDistricts)) {
      if (lowerLocation.includes(district)) {
        return coords;
      }
    }

    // Fallback to city center coordinates
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
      sanliurfa: [37.1674, 38.7955],
      malatya: [38.3552, 38.3095],
      van: [38.4941, 43.38],
      denizli: [37.7833, 29.0833],
      kocaeli: [40.7667, 29.9167],
      sakarya: [40.7333, 30.4],
      mugla: [37.2167, 28.3667],
      aydin: [37.85, 27.85],
      manisa: [38.6167, 27.4167],
      balikesir: [39.65, 27.8833],
      tekirdag: [41.0, 27.5167],
      edirne: [41.6667, 26.5667],
      canakkale: [40.15, 26.4],
      hatay: [36.2, 36.15],
      kahramanmaras: [37.5833, 36.9333],
      mardin: [37.3167, 40.7333],
      batman: [37.8833, 41.1333],
      elazig: [38.675, 39.2233],
      agri: [39.7167, 43.05],
      kars: [40.6167, 43.1],
      rize: [41.0208, 40.5219],
      giresun: [40.9167, 38.3833],
      ordu: [40.9833, 37.8833],
      artvin: [41.1833, 41.8167],
      gumushane: [40.4667, 39.4833],
      bayburt: [40.2556, 40.2244],
      bingol: [38.8833, 40.5],
      mus: [38.7333, 41.4833],
      bitlis: [38.4, 42.1167],
      siirt: [37.9333, 41.9333],
      sirnak: [37.5167, 42.45],
      hakkari: [37.5833, 43.7333],
      tunceli: [39.1167, 39.5333],
      igdir: [39.9167, 44.05],
      ardahan: [41.1167, 42.7],
    };

    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (lowerLocation.includes(city)) {
        return coords;
      }
    }

    // Default: center of Turkey
    return [39.0, 35.0];
  };

  const handleCarClick = (carId: string) => {
    if (onCarSelect) {
      onCarSelect(carId);
    } else {
      navigate(`/car/${carId}`);
    }
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
      <MapContainer
        center={mapCenter}
        zoom={userLocation ? 13 : 6}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && <MapController center={mapCenter} />}

        {/* User location marker */}
        {showUserLocation && userLocation && (
          <>
            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={userIcon}
            >
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
              pathOptions={{
                color: "hsl(220, 90%, 56%)",
                fillColor: "hsl(220, 90%, 56%)",
                fillOpacity: 0.1,
              }}
            />
          </>
        )}

        {/* Car markers */}
        {cars.map((car) => {
          let position: [number, number] | null = null;

          if (car.latitude && car.longitude) {
            position = [car.latitude, car.longitude];
          } else if (car.location) {
            position = getCoordinatesFromLocation(car.location);
          }

          if (!position) return null;

          return (
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
                      <span className="font-bold text-primary">
                        {car.price_per_hour}₺/saat
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleCarClick(car.id)}
                        className="text-xs h-7"
                      >
                        Kirala
                      </Button>
                    </div>
                  </div>
                </Card>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default CarsMap;

// @ts-nocheck
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";

const selectedLocationIcon = L.divIcon({
  className: "custom-pin-icon",
  html: `<div style="
    background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.8));
    width: 32px;
    height: 32px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="
      width: 10px;
      height: 10px;
      background: white;
      border-radius: 50%;
      transform: rotate(45deg);
    "></div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface LocationPickerMapProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  height?: string;
}

const MapClickHandler = ({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const LocationPickerMap = ({
  initialLat = 41.0082,
  initialLng = 28.9784,
  onLocationSelect,
  height = "300px",
}: LocationPickerMapProps) => {
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>([initialLat, initialLng]);
  const [isLocating, setIsLocating] = useState(false);
  const [addressText, setAddressText] = useState<string>("");

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.searchParams.set("format", "json");
      url.searchParams.set("lat", lat.toString());
      url.searchParams.set("lon", lng.toString());
      url.searchParams.set("accept-language", "tr");

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        const address = data.display_name || "";
        setAddressText(address);
        return address;
      }
    } catch {
      // Silent fail
    }
    return "";
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedPosition([lat, lng]);
    const address = await reverseGeocode(lat, lng);
    onLocationSelect(lat, lng, address);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setSelectedPosition([lat, lng]);
        setMapCenter([lat, lng]);
        const address = await reverseGeocode(lat, lng);
        onLocationSelect(lat, lng, address);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground flex items-center gap-1 break-words">
          <MapPin className="w-4 h-4 shrink-0" />
          Haritada konumu seçmek için tıklayın
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          disabled={isLocating}
          className="w-full sm:w-auto"
        >
          <Crosshair className="w-4 h-4 mr-1" />
          {isLocating ? "Konum alınıyor..." : "Mevcut Konum"}
        </Button>
      </div>

      <div className="rounded-lg overflow-hidden border border-border" style={{ height }}>
        <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationSelect={handleMapClick} />
          <MapController center={mapCenter} />
          {selectedPosition && <Marker position={selectedPosition} icon={selectedLocationIcon} />}
        </MapContainer>
      </div>

      {selectedPosition && (
        <div className="p-3 bg-muted/50 rounded-lg space-y-1 overflow-hidden">
          <p className="text-sm font-medium text-foreground">Seçilen Konum</p>
          <p className="text-xs text-muted-foreground break-words">
            {addressText || `${selectedPosition[0].toFixed(6)}, ${selectedPosition[1].toFixed(6)}`}
          </p>
          <p className="text-xs text-muted-foreground break-words">
            Koordinatlar: {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationPickerMap;

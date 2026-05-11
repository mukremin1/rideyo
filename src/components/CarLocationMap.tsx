import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface CarLocationMapProps {
  latitude: number;
  longitude: number;
  carName: string;
}

const CarLocationMap = ({ latitude, longitude, carName }: CarLocationMapProps) => {
  const position: [number, number] = [latitude, longitude];

  return (
    <div className="h-64 w-full rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={position}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>{carName}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default CarLocationMap;

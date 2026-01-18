import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import AboutSection from "@/components/AboutSection";
import ReservationSteps from "@/components/ReservationSteps";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import Footer from "@/components/Footer";
import CarsMap from "@/components/CarsMap";
import NearbyVehicles from "@/components/NearbyVehicles";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, MapPin, Bell } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const Index = () => {
  const navigate = useNavigate();
  const { latitude, longitude, loading: locationLoading, requestPermission: requestLocationPermission } = useGeolocation();
  const { permission: notifPermission, requestPermission: requestNotifPermission, isSupported: notifSupported } = usePushNotifications();
  const [showMap, setShowMap] = useState(true);

  const userLocation = latitude && longitude ? { latitude, longitude } : null;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />
      
      {/* Premium Banner - Mobile Optimized */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 md:py-3 px-4 mt-14 md:mt-16">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <Crown className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">Aylık aboneliklerle %25'e varan indirimler!</span>
          </div>
          <div className="flex items-center gap-2">
            {notifSupported && notifPermission !== "granted" && (
              <Button 
                size="sm" 
                variant="secondary"
                onClick={requestNotifPermission}
                className="whitespace-nowrap"
              >
                <Bell className="w-4 h-4 mr-1" />
                Bildirimleri Aç
              </Button>
            )}
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => navigate('/subscription')}
              className="whitespace-nowrap"
            >
              Paketleri Gör
            </Button>
          </div>
        </div>
      </div>

      <Hero />

      {/* Map Section */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                <MapPin className="w-8 h-8 text-primary" />
                Araçları Haritada Gör
              </h2>
              <p className="text-muted-foreground">
                Konumunuza yakın araçları haritada görüntüleyin
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!userLocation && !locationLoading && (
                <Button variant="outline" onClick={requestLocationPermission}>
                  <MapPin className="w-4 h-4 mr-2" />
                  Konumu Etkinleştir
                </Button>
              )}
              <Button 
                variant={showMap ? "default" : "outline"}
                onClick={() => setShowMap(!showMap)}
              >
                {showMap ? "Haritayı Gizle" : "Haritayı Göster"}
              </Button>
            </div>
          </div>

          {showMap && (
            <CarsMap 
              userLocation={userLocation} 
              showUserLocation={true}
              height="500px"
            />
          )}
        </div>
      </section>

      {/* Nearby Vehicles Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <NearbyVehicles maxDistance={100} limit={6} />
        </div>
      </section>

      <AboutSection />
      <ReservationSteps />
      <HowItWorks />
      <Features />
      <Footer />
    </div>
  );
};

export default Index;
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
  const {
    latitude,
    longitude,
    loading: locationLoading,
    requestPermission: requestLocationPermission,
  } = useGeolocation();
  const {
    permission: notifPermission,
    requestPermission: requestNotifPermission,
    isSupported: notifSupported,
  } = usePushNotifications();
  const [showMap, setShowMap] = useState(true);

  const userLocation = latitude && longitude ? { latitude, longitude } : null;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0 overflow-x-hidden pt-[calc(env(safe-area-inset-top)+4.5rem)] md:pt-[calc(env(safe-area-inset-top)+5rem)]">
      <Navbar />

      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white py-1.5 md:py-2.5 px-3 sm:px-4 overflow-x-hidden">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="flex min-w-0 items-center gap-2 text-left">
            <Crown className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="min-w-0 text-[13px] sm:text-sm font-semibold leading-tight break-words tracking-tight">
              Aylık aboneliklerle %25'e varan indirimler!
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-stretch gap-2 w-full md:w-auto">
            {notifSupported && notifPermission !== "granted" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={requestNotifPermission}
                className="w-full md:w-auto whitespace-nowrap h-8 sm:h-9 px-3 text-[11px] sm:text-xs md:text-sm"
              >
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                Bildirimleri Aç
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate("/subscription")}
              className="w-full md:w-auto whitespace-nowrap h-8 sm:h-9 px-3 text-[11px] sm:text-xs md:text-sm"
            >
              Paketleri Gör
            </Button>
          </div>
        </div>
      </div>

      <Hero />

      <section className="py-12 px-4 bg-muted/30 overflow-x-hidden">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 flex items-center gap-2 break-words">
                <MapPin className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
                Araçları Haritada Gör
              </h2>
              <p className="text-muted-foreground break-words">
                Konumunuza yakın araçları haritada görüntüleyin
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {!userLocation && !locationLoading && (
                <Button variant="outline" onClick={requestLocationPermission} className="w-full sm:w-auto whitespace-normal">
                  <MapPin className="w-4 h-4 mr-2" />
                  Konumu Etkinleştir
                </Button>
              )}
              <Button
                variant={showMap ? "default" : "outline"}
                onClick={() => setShowMap(!showMap)}
                className="w-full sm:w-auto whitespace-normal"
              >
                {showMap ? "Haritayı Gizle" : "Haritayı Göster"}
              </Button>
            </div>
          </div>

          {showMap && (
            <div className="relative z-0 mt-2 md:mt-4 mb-8 md:mb-10">
              <CarsMap userLocation={userLocation} showUserLocation={true} height="min(500px, 62vh)" />
            </div>
          )}
        </div>
      </section>

      <section className="relative z-10 py-12 px-4 bg-background">
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


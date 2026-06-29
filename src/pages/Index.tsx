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
import { useTranslation } from "react-i18next";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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

      <div className="overflow-x-hidden bg-gradient-to-r from-primary via-primary/95 to-accent py-2 px-3 text-primary-foreground sm:px-4 md:py-2.5">
        <div className="container mx-auto grid grid-cols-1 items-center gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 items-center gap-2 text-left">
            <Crown className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
            <span className="min-w-0 break-words text-[13px] font-medium leading-tight sm:text-sm">
              {t("home.promoBanner")}
            </span>
          </div>
          <div className="grid w-full grid-cols-1 items-stretch gap-2 sm:grid-cols-2 md:flex md:w-auto">
            {notifSupported && notifPermission !== "granted" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={requestNotifPermission}
                className="h-8 w-full whitespace-nowrap px-3 text-[11px] sm:h-9 sm:text-xs md:w-auto md:text-sm"
              >
                <Bell className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {t("home.enableNotifications")}
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate("/packages")}
              className="h-8 w-full whitespace-nowrap px-3 text-[11px] sm:h-9 sm:text-xs md:w-auto md:text-sm"
            >
              {t("home.viewPlans")}
            </Button>
          </div>
        </div>
      </div>

      <Hero />

      <section className="py-12 px-4 bg-muted/30 overflow-x-hidden">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <div className="min-w-0">
              <h2 className="mb-2 flex items-center gap-2 break-words text-2xl font-bold text-foreground sm:text-3xl">
                <MapPin className="h-7 w-7 shrink-0 text-primary sm:h-8 sm:w-8" />
                {t("home.mapTitle")}
              </h2>
              <p className="break-words text-muted-foreground">
                {t("home.mapDesc")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {!userLocation && !locationLoading && (
                <Button variant="outline" onClick={requestLocationPermission} className="w-full sm:w-auto whitespace-normal">
                  <MapPin className="w-4 h-4 mr-2" />
                  {t("home.enableLocation")}
                </Button>
              )}
              <Button
                variant={showMap ? "default" : "outline"}
                onClick={() => setShowMap(!showMap)}
                className="w-full sm:w-auto whitespace-normal"
              >
                {showMap ? t("home.hideMap") : t("home.showMap")}
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


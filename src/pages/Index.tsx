import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import AboutSection from "@/components/AboutSection";
import ReservationSteps from "@/components/ReservationSteps";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import Footer from "@/components/Footer";
import HomeRentalTypes from "@/components/HomeRentalTypes";
import HomeMapSection from "@/components/HomeMapSection";
import NearbyVehicles from "@/components/NearbyVehicles";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, Bell } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTranslation } from "react-i18next";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    permission: notifPermission,
    requestPermission: requestNotifPermission,
    isSupported: notifSupported,
  } = usePushNotifications();

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0 overflow-x-hidden pt-[calc(env(safe-area-inset-top)+4.5rem)] md:pt-[calc(env(safe-area-inset-top)+5rem)]">
      <Navbar />

      <div className="overflow-x-hidden border-b border-primary/10 bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(18_90%_46%))] px-4 py-3 text-primary-foreground sm:px-6">
        <div className="container mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3 text-left">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
              <Crown className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
                {t("home.promoEyebrow")}
              </p>
              <p className="mt-0.5 text-sm font-medium leading-snug tracking-tight sm:text-[0.9375rem]">
                {t("home.promoBanner")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-stretch gap-2 md:shrink-0">
            {notifSupported && notifPermission !== "granted" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={requestNotifPermission}
                className="h-9 flex-1 rounded-lg border-0 bg-white/95 px-4 text-xs font-semibold text-foreground shadow-sm hover:bg-white sm:flex-none sm:text-sm"
              >
                <Bell className="mr-1.5 h-3.5 w-3.5" />
                {t("home.enableNotifications")}
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate("/packages")}
              className="h-9 flex-1 rounded-lg border border-white/25 bg-white/10 px-4 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/20 sm:flex-none sm:text-sm"
            >
              {t("home.viewPlans")}
            </Button>
          </div>
        </div>
      </div>

      <HomeRentalTypes />
      <HomeMapSection />

      <section className="relative z-10 hidden py-8 px-4 bg-background md:block md:py-12">
        <div className="container mx-auto">
          <NearbyVehicles maxDistance={100} limit={6} skipLocationPrompt />
        </div>
      </section>

      <div className="hidden md:block">
        <Hero />
      </div>
      <AboutSection />
      <ReservationSteps />
      <HowItWorks />
      <Features />
      <Footer />
    </div>
  );
};

export default Index;

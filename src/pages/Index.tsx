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

      <div className="overflow-x-hidden border-b border-primary/10 bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(18_90%_46%))] px-3 py-2.5 text-primary-foreground sm:px-6 sm:py-3">
        <div className="container mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm sm:mt-0 sm:h-8 sm:w-8">
              <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/80 sm:text-[11px]">
                {t("home.promoEyebrow")}
              </p>
              <p className="mt-0.5 break-words text-[11px] font-medium leading-snug sm:text-sm">
                {t("home.promoBanner")}
              </p>
            </div>
          </div>
          <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            {notifSupported && notifPermission !== "granted" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={requestNotifPermission}
                className="h-8 min-w-0 rounded-lg border-0 bg-white/95 px-2 text-[10px] font-semibold text-foreground shadow-sm hover:bg-white sm:h-9 sm:px-4 sm:text-sm"
              >
                <Bell className="mr-1 h-3 w-3 shrink-0 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                <span className="truncate">{t("home.enableNotifications")}</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate("/packages")}
              className={`h-8 min-w-0 rounded-lg border border-white/25 bg-white/10 px-2 text-[10px] font-semibold text-white backdrop-blur-sm hover:bg-white/20 sm:h-9 sm:px-4 sm:text-sm ${
                notifSupported && notifPermission !== "granted" ? "" : "col-span-2 sm:col-span-1"
              }`}
            >
              <span className="truncate">{t("home.viewPlans")}</span>
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

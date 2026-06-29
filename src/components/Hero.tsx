import { Button } from "./ui/button";
import { MapPin, Clock, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import heroImage from "@/assets/hero-image.jpg";

const Hero = () => {
  const { t } = useTranslation();

  return (
    <section className="relative flex min-h-[88vh] items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/55" />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-16 sm:px-6 lg:px-8 sm:py-20">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-xs font-semibold leading-tight text-primary sm:text-sm">
              {t("home.heroBadge")}
            </span>
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight text-foreground sm:text-6xl lg:text-7xl">
            {t("home.heroTitle1")}
            <span className="mt-1 block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t("home.heroTitle2")}
            </span>
          </h1>

          <p className="mb-8 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {t("home.heroDesc")}
          </p>

          <div className="mb-12 flex flex-wrap gap-3 sm:gap-4">
            <Link to="/cars" className="w-full sm:w-auto">
              <Button size="lg" className="h-12 w-full px-8 text-base sm:h-14 sm:w-auto sm:text-lg">
                {t("home.rentCar")}
              </Button>
            </Link>
            <Link to="/cars" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full px-8 text-base sm:h-14 sm:w-auto sm:text-lg"
              >
                {t("home.browseFleet")}
              </Button>
            </Link>
            <Link to="/add-car" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="secondary"
                className="h-auto min-h-12 w-full px-6 py-3 text-center text-sm sm:min-h-14 sm:w-auto sm:text-base"
              >
                {t("home.listYourCar")}
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-4 backdrop-blur-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">7/24</div>
                <div className="text-sm text-muted-foreground">{t("home.stat247")}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-4 backdrop-blur-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">20+</div>
                <div className="text-sm text-muted-foreground">{t("home.statCities")}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-4 backdrop-blur-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">SSL</div>
                <div className="text-sm text-muted-foreground">{t("home.statSecure")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

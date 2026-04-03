import { Button } from "./ui/button";
import { MapPin, Clock, Zap } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
      </div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="max-w-2xl">
          <div className="inline-flex max-w-full items-center gap-2 px-3 py-2 sm:px-4 rounded-full bg-accent/15 border border-accent/30 mb-6">
            <Zap className="w-4 h-4 text-accent shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-accent leading-tight break-words">
              Türkiye'nin En Hızlı Araç Kiralama Platformu
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight break-words">
            Dakikalar İçinde
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Araç Kirala
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed break-words">
            İstediğin yerde araç bul, kilitle ve git. Dakikalık, saatlik veya günlük kiralama ile km paketleri.
            Yakıt bizden!
          </p>

          <div className="flex flex-wrap gap-3 sm:gap-4 mb-12">
            <a href="/cars" className="w-full sm:w-auto">
              <Button size="lg" className="text-base sm:text-lg h-12 sm:h-14 w-full sm:w-auto px-6 sm:px-8">
                Hemen Başla
              </Button>
            </a>
            <a href="/cars" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="text-base sm:text-lg h-12 sm:h-14 w-full sm:w-auto px-6 sm:px-8"
              >
                Araçları İncele
              </Button>
            </a>
            <a href="/my-cars" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="secondary"
                className="text-sm sm:text-lg h-auto min-h-12 sm:min-h-14 w-full sm:w-auto px-5 sm:px-8 py-3 whitespace-normal text-center"
              >
                Kendi Aracınızı Yükleyin, Kazanmaya Başlayın
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">24/7</div>
                <div className="text-sm text-muted-foreground">Hizmet</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">2dk</div>
                <div className="text-sm text-muted-foreground">Kiralama</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

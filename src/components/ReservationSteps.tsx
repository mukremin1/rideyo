import { Car, Calendar, CreditCard, CheckCircle, MapPin, Shield } from "lucide-react";

const ReservationSteps = () => {
  const steps = [
    {
      icon: Car,
      title: "Araç Seçin",
      description: "İhtiyacınıza uygun aracı seçin. Fiyat, özellik ve konuma göre filtreleyin."
    },
    {
      icon: Calendar,
      title: "Tarih Belirleyin",
      description: "Kiralama sürenizi dakika, saat veya gün olarak belirleyin."
    },
    {
      icon: MapPin,
      title: "Alış/Bırakış Noktası",
      description: "Aracı teslim alacağınız ve bırakacağınız noktayı seçin."
    },
    {
      icon: Shield,
      title: "Sigorta Paketi",
      description: "İhtiyacınıza uygun sigorta paketini tercih edin."
    },
    {
      icon: CreditCard,
      title: "Güvenli Ödeme",
      description: "Kredi kartı veya banka kartı ile güvenli ödeme yapın."
    },
    {
      icon: CheckCircle,
      title: "Rezervasyon Onayı",
      description: "Rezervasyonunuz anında onaylanır ve aracınız hazır olur."
    }
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Rezervasyon Adımları
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Sadece birkaç adımda aracınızı kiralayın. Hızlı, kolay ve güvenli.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="relative bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300 group"
            >
              {/* Step Number */}
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>
              
              {/* Icon */}
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <step.icon className="w-7 h-7 text-primary" />
              </div>
              
              {/* Content */}
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {step.description}
              </p>

              {/* Connector Line (for non-last items) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-border" />
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a 
            href="/cars"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            <Car className="w-5 h-5" />
            Hemen Araç Seçin
          </a>
        </div>
      </div>
    </section>
  );
};

export default ReservationSteps;

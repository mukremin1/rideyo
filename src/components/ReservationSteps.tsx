import { Car, Calendar, CreditCard, CheckCircle, MapPin, Shield, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";

const ReservationSteps = () => {
  const steps = [
    {
      icon: Car,
      title: "Araç Seçimi",
      description: "Fiyat, konum ve araç tipine göre filtreleyerek size uygun aracı belirleyin.",
    },
    {
      icon: Calendar,
      title: "Süre Belirleme",
      description: "Dakikalık, saatlik veya günlük kiralama süresini ihtiyacınıza göre planlayın.",
    },
    {
      icon: MapPin,
      title: "Teslim Noktası",
      description: "Alış ve bırakış konumunu seçerek rotanızı netleştirin.",
    },
    {
      icon: Shield,
      title: "Sigorta ve Ek Hizmetler",
      description: "Sigorta paketi ve isteğe bağlı ek sürücü seçeneklerini yapılandırın.",
    },
    {
      icon: CreditCard,
      title: "Güvenli Ödeme",
      description: "Kredi veya banka kartınızla güvenli ödeme altyapısı üzerinden işlemi tamamlayın.",
    },
    {
      icon: CheckCircle,
      title: "Rezervasyon Onayı",
      description: "Onay sonrası rezervasyon detaylarınız hesabınızda görüntülenir.",
    },
  ];

  return (
    <section className="bg-background py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Rezervasyon Süreci
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Birkaç adımda rezervasyonunuzu oluşturun. Tüm süreç mobil uygulama üzerinden yönetilir.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="group relative rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg"
            >
              <div className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </div>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <step.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/cars">
              <Car className="mr-2 h-5 w-5" />
              Araç Filosunu Görüntüle
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/identity-verification">
              <UserPlus className="mr-2 h-5 w-5" />
              Kimlik Doğrulaması
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ReservationSteps;

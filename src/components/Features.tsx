import { Shield, Zap, CreditCard, Clock, Fuel, Smartphone } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Hızlı Rezervasyon",
    description: "Birkaç adımda rezervasyon oluşturun, ödemenizi tamamlayın ve yola çıkın.",
  },
  {
    icon: CreditCard,
    title: "Esnek Fiyatlandırma",
    description: "Dakikalık, saatlik ve günlük kiralama ile kilometre paketleri arasından seçim yapın.",
  },
  {
    icon: Fuel,
    title: "Yakıt Desteği",
    description: "Seçili kiralama planlarında yakıt masrafları tarafımızca karşılanır.",
  },
  {
    icon: Shield,
    title: "Güvenli Deneyim",
    description: "Kimlik doğrulama, sigorta seçenekleri ve bakımlı araç filosu ile güvenle sürün.",
  },
  {
    icon: Clock,
    title: "7/24 Erişim",
    description: "İstediğiniz zaman rezervasyon oluşturun, destek ekibimize ulaşın.",
  },
  {
    icon: Smartphone,
    title: "Mobil Öncelikli",
    description: "Tüm süreçleri telefonunuzdan yönetin; harita, ödeme ve kiralama tek uygulamada.",
  },
];

const Features = () => {
  return (
    <section className="bg-muted/30 py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <div className="mb-4 inline-block rounded-full border border-accent/20 bg-accent/10 px-4 py-2">
            <span className="text-sm font-semibold text-accent">Avantajlar</span>
          </div>
          <h2 className="mb-4 text-4xl font-bold text-foreground sm:text-5xl">
            Neden RideYo?
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            Modern mobil kiralama deneyimi için ihtiyaç duyduğunuz tüm hizmetler tek platformda.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
                <feature.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

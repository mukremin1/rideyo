import { Shield, Users, Clock, Award } from "lucide-react";

const AboutSection = () => {
  const stats = [
    { icon: Users, value: "50.000+", label: "Kayıtlı Kullanıcı" },
    { icon: Shield, value: "%100", label: "Güvenli İşlem" },
    { icon: Clock, value: "7/24", label: "Müşteri Desteği" },
    { icon: Award, value: "5 Yıl", label: "Sektör Deneyimi" },
  ];

  return (
    <section className="bg-muted/30 py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">RideYo Hakkında</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            RideYo, Türkiye genelinde araç kiralama deneyimini dijitalleştiren bir mobil platformdur.
            Güvenilir filo, şeffaf fiyatlandırma ve kullanıcı odaklı hizmet anlayışıyla yanınızdayız.
          </p>
        </div>

        <div className="mb-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card p-6 text-center shadow-sm"
            >
              <stat.icon className="mx-auto mb-3 h-10 w-10 text-primary" />
              <div className="mb-1 text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-4 text-2xl font-semibold text-foreground">Platform Avantajları</h3>
            <ul className="space-y-3">
              {[
                "Geniş araç filosu ile farklı ihtiyaçlara uygun seçenekler",
                "Şeffaf fiyatlandırma; gizli ücret yok",
                "Kapsamlı sigorta ve ek sürücü seçenekleri",
                "Hızlı rezervasyon, dijital doğrulama ve kolay teslim",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-sm text-primary">✓</span>
                  </div>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 p-8 text-center">
            <blockquote className="mb-4 text-lg italic text-foreground">
              &ldquo;Her yolculuğun güvenli, kolay ve öngörülebilir olması için teknoloji ve hizmeti bir araya getiriyoruz.&rdquo;
            </blockquote>
            <p className="text-sm text-muted-foreground">— RideYo Ekibi</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;

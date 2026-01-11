import { Shield, Users, Clock, Award } from "lucide-react";

const AboutSection = () => {
  const stats = [
    { icon: Users, value: "50,000+", label: "Mutlu Müşteri" },
    { icon: Shield, value: "100%", label: "Güvenli Kiralama" },
    { icon: Clock, value: "7/24", label: "Destek Hizmeti" },
    { icon: Award, value: "5 Yıl", label: "Sektör Deneyimi" },
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Hakkımızda</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            RideYo olarak, Türkiye'nin dört bir yanında araç kiralama deneyimini yeniden tanımlıyoruz. 
            Güvenilir, hızlı ve ekonomik çözümlerimizle her zaman yanınızdayız.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="bg-card rounded-xl p-6 text-center shadow-sm border border-border"
            >
              <stat.icon className="w-10 h-10 text-primary mx-auto mb-3" />
              <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-2xl font-semibold text-foreground mb-4">Neden RideYo?</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-primary text-sm">✓</span>
                </div>
                <span className="text-muted-foreground">Geniş araç filosu ile her bütçeye uygun seçenekler</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-primary text-sm">✓</span>
                </div>
                <span className="text-muted-foreground">Şeffaf fiyatlandırma, gizli maliyet yok</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-primary text-sm">✓</span>
                </div>
                <span className="text-muted-foreground">Kapsamlı sigorta seçenekleri</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-primary text-sm">✓</span>
                </div>
                <span className="text-muted-foreground">Kolay rezervasyon ve hızlı teslimat</span>
              </li>
            </ul>
          </div>
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-8 text-center">
            <blockquote className="text-lg italic text-foreground mb-4">
              "Müşterilerimize en iyi deneyimi sunmak için sürekli kendimizi geliştiriyoruz."
            </blockquote>
            <p className="text-muted-foreground text-sm">- RideYo Ekibi</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
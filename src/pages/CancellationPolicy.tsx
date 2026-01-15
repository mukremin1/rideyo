import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { XCircle, RefreshCcw, AlertTriangle, CheckCircle, Clock, CreditCard } from "lucide-react";

const CancellationPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="flex items-center gap-3 mb-8">
          <RefreshCcw className="w-10 h-10 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">İptal ve İade Koşulları</h1>
        </div>
        
        <div className="prose prose-lg max-w-none space-y-8 text-muted-foreground">
          <section className="bg-muted p-6 rounded-lg">
            <p className="text-sm">
              RideYo platformu üzerinden yapılan rezervasyonların iptal ve iade koşulları aşağıda belirtilmiştir.
              Lütfen rezervasyon yapmadan önce bu koşulları dikkatlice okuyunuz.
            </p>
            <p className="text-sm mt-2">
              <strong>Son Güncelleme:</strong> {new Date().toLocaleDateString('tr-TR')}
            </p>
          </section>

          {/* Cancellation Timeline */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-6">Kiracı İptal Koşulları</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  <div>
                    <h3 className="text-xl font-semibold text-green-700 dark:text-green-300">24+ Saat Önce</h3>
                    <p className="text-sm text-green-600 dark:text-green-400">Tam iade</p>
                  </div>
                </div>
                <p className="text-green-700 dark:text-green-300">
                  Kiralama başlangıcından 24 saat veya daha önce yapılan iptallerde ödenen tutarın <strong>%100'ü</strong> iade edilir.
                </p>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                  <div>
                    <h3 className="text-xl font-semibold text-yellow-700 dark:text-yellow-300">12-24 Saat Arası</h3>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">Kısmi iade</p>
                  </div>
                </div>
                <p className="text-yellow-700 dark:text-yellow-300">
                  Kiralama başlangıcından 12-24 saat arası yapılan iptallerde ödenen tutarın <strong>%50'si</strong> iade edilir.
                </p>
              </div>

              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                  <div>
                    <h3 className="text-xl font-semibold text-orange-700 dark:text-orange-300">12 Saatten Az</h3>
                    <p className="text-sm text-orange-600 dark:text-orange-400">İade yok</p>
                  </div>
                </div>
                <p className="text-orange-700 dark:text-orange-300">
                  Kiralama başlangıcından 12 saatten kısa süre önce yapılan iptallerde <strong>iade yapılmaz</strong>.
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  <div>
                    <h3 className="text-xl font-semibold text-red-700 dark:text-red-300">No-show (Gelmeme)</h3>
                    <p className="text-sm text-red-600 dark:text-red-400">İade yok</p>
                  </div>
                </div>
                <p className="text-red-700 dark:text-red-300">
                  Rezervasyon saatinde haber vermeden gelmeme durumunda <strong>iade yapılmaz</strong>.
                </p>
              </div>
            </div>
          </section>

          {/* Owner Cancellation */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Araç Sahibi İptal Koşulları</h2>
            
            <div className="bg-card p-6 rounded-xl border border-border">
              <p className="mb-4">
                Araç sahibinin son dakika iptali yapması durumunda:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-6">
                <li>Kiracıya alternatif araç sağlamakla yükümlüdür</li>
                <li>Alternatif araç sağlanamazsa, rezervasyon bedeli kiracıya <strong>%120</strong> olarak iade edilir</li>
                <li>Tekrarlayan iptallerde araç sahibinin hesabı askıya alınabilir</li>
                <li>RideYo, kiracıya uygun alternatif araç bulmada yardımcı olur</li>
              </ul>
            </div>
          </section>

          {/* Refund Process */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">İade Süreci</h2>
            
            <div className="bg-card p-6 rounded-xl border border-border">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-8 h-8 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">Ödeme İadeleri</h3>
              </div>
              <ul className="list-disc list-inside space-y-2 ml-6">
                <li>İade talepleri uygulama üzerinden veya müşteri hizmetleri aracılığıyla yapılabilir</li>
                <li>İadeler, ödeme yapılan aynı yönteme (kredi kartı, banka kartı) yapılır</li>
                <li>Kredi kartı iadeleri 5-10 iş günü içinde hesaba yansır</li>
                <li>Banka kartı iadeleri 3-5 iş günü içinde hesaba yansır</li>
                <li>İade durumu SMS ve e-posta ile bildirilir</li>
              </ul>
            </div>
          </section>

          {/* Special Circumstances */}
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Özel Durumlar</h2>
            
            <div className="space-y-4">
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="text-xl font-semibold text-foreground mb-2">Mücbir Sebepler</h3>
                <p>
                  Doğal afet, salgın hastalık, savaş gibi mücbir sebep durumlarında tam iade yapılır.
                  Bu durumların tespiti RideYo yönetimince yapılır.
                </p>
              </div>

              <div className="bg-card p-4 rounded-lg border">
                <h3 className="text-xl font-semibold text-foreground mb-2">Araç Arızası</h3>
                <p>
                  Kiralama süresince araçta oluşan teknik arıza nedeniyle kullanılamaz hale gelmesi durumunda,
                  kullanılmayan süre için tam iade yapılır veya alternatif araç sağlanır.
                </p>
              </div>

              <div className="bg-card p-4 rounded-lg border">
                <h3 className="text-xl font-semibold text-foreground mb-2">Erken İade</h3>
                <p>
                  Kiralama süresinden önce araç iade edilmesi durumunda, kullanılmayan süre için iade yapılmaz.
                  Günlük kiralamada erken iade istenirse, saatlik ücret üzerinden hesaplama yapılır.
                </p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-muted p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-foreground mb-4">İletişim</h2>
            <p>
              İptal ve iade işlemleriniz için 7/24 müşteri hizmetlerimize ulaşabilirsiniz.
            </p>
            <div className="mt-4 space-y-1">
              <p>Telefon: 0539 526 32 93</p>
              <p>E-posta: destek@rideyo.com</p>
              <p>WhatsApp: +90 539 526 32 93</p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CancellationPolicy;

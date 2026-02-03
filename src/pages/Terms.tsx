import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-6">Kullanım Koşulları</h1>
          <p className="text-muted-foreground mb-8">Son Güncelleme: 23 Ekim 2024</p>
          
          <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Genel Hükümler</h2>
              <p>
                Bu Kullanım Koşulları, RideYo platformunu kullanımınızı düzenleyen yasal bir sözleşmedir. 
                Platformu kullanarak bu koşulları kabul etmiş sayılırsınız. Eğer bu koşulları kabul etmiyorsanız, 
                lütfen platformu kullanmayınız.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Hizmet Tanımı</h2>
              <p>
                RideYo, araç sahipleri ile kiralayıcıları bir araya getiren dijital bir platformdur. 
                Platform, araç paylaşımını kolaylaştırır ancak araçların sahibi değildir. Tüm araçlar, 
                bağımsız araç sahipleri tarafından sağlanır.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Kullanıcı Hesapları</h2>
              <h3 className="text-xl font-semibold text-foreground mb-3">3.1 Kayıt</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Platformu kullanmak için 18 yaşında veya üzerinde olmalısınız</li>
                <li>Geçerli bir ehliyet sahibi olmalısınız</li>
                <li>Doğru ve güncel bilgiler sağlamalısınız</li>
                <li>Hesap güvenliğinden siz sorumlusunuz</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-4">3.2 Hesap Türleri</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Kullanıcı Hesabı:</strong> Araç kiralama hizmeti alabilirsiniz</li>
                <li><strong>Araç Sahibi Hesabı:</strong> Aracınızı kiraya verebilir ve araç kiralayabilirsiniz</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Kiralama Koşulları</h2>
              <h3 className="text-xl font-semibold text-foreground mb-3">4.1 Rezervasyon</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Rezervasyonlar onaylandıktan sonra bağlayıcıdır</li>
                <li>Dakikalık kiralama için provizyon çekilir</li>
                <li>Saatlik ve günlük kiralamalar için tam ödeme yapılır</li>
                <li>Fiyatlar araç sahibi tarafından belirlenir</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-4">4.2 Araç Teslimi</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Araç teslim ve iade saatleri belirlenen zamanda yapılmalıdır</li>
                <li>Teslim sırasında aracın durumu kontrol edilmelidir</li>
                <li>Yakıt seviyesi teslim durumunda iade edilmelidir</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-4">4.3 Kullanım</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Aracı sadece siz kullanabilirsiniz (ehliyet sahibi olarak)</li>
                <li>Trafik kurallarına uymanız zorunludur</li>
                <li>Aracı ticari amaçla kullanamazsınız (aksi belirtilmedikçe)</li>
                <li>Alkol veya uyuşturucu etkisi altında araç kullanamazsınız</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Ödeme ve Faturalama</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Tüm ödemeler platform üzerinden yapılmalıdır</li>
                <li>Dakikalık kiralama: Kullanılan süre kadar ücretlendirilir</li>
                <li>Saatlik kiralama: Belirlenen saat başına ücretlendirilir</li>
                <li>Günlük kiralama: 24 saatlik periyotlar halinde ücretlendirilir</li>
                <li>Geç iade için ek ücret uygulanır</li>
                <li>Platform hizmet bedeli %15 olarak uygulanır</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. İptal Politikası</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Kiralama başlangıcından 24 saat öncesine kadar ücretsiz iptal</li>
                <li>24 saat içinde iptal: %50 iade</li>
                <li>Kiralama başladıktan sonra iptal: İade yok</li>
                <li>Araç sahibi iptali: Tam iade + %20 tazminat</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Sigorta ve Sorumluluk</h2>
              <h3 className="text-xl font-semibold text-foreground mb-3">7.1 Kapsam</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Tüm araçlar kasko sigortası ile korunmaktadır</li>
                <li>Zorunlu trafik sigortası mevcuttur</li>
                <li>Mini hasar muafiyeti: 500 TL</li>
                <li>Büyük hasar muafiyeti: 2.000 TL</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-4">7.2 Sorumluluklar</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Trafik cezaları kiralayıcıya aittir</li>
                <li>Kaza durumunda derhal bildirim yapılmalıdır</li>
                <li>Kasıtlı hasar durumunda tam sorumluluk kiralayıcıya aittir</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Araç Sahipleri İçin Kurallar</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Aracınızın ruhsatı, sigortası ve muayenesi güncel olmalıdır</li>
                <li>Araç temiz ve çalışır durumda teslim edilmelidir</li>
                <li>Fiyatlandırma adil ve piyasa koşullarına uygun olmalıdır</li>
                <li>Rezervasyonları onurlandırma zorunluluğu vardır</li>
                <li>Araç özellikleri doğru ve eksiksiz belirtilmelidir</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Yasaklanan Davranışlar</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Platform dışı ödeme veya iletişim</li>
                <li>Sahte bilgi veya belge sağlama</li>
                <li>Diğer kullanıcılara taciz veya tehdit</li>
                <li>Sistemleri manipüle etmeye çalışma</li>
                <li>Yasal olmayan faaliyetler için araç kullanımı</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Hesap Askıya Alma ve Sonlandırma</h2>
              <p>
                RideYo, bu koşulların ihlali durumunda hesabınızı askıya alma veya sonlandırma hakkını saklı tutar. 
                Ciddi ihlaller durumunda yasal işlem başlatılabilir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">11. Sorumluluk Reddi</h2>
              <p>
                RideYo, araç sahipleri ve kiralayıcılar arasında bir aracı platformdur. Araçların kalitesi, 
                güvenliği ve uygunluğu konusunda garanti vermez. Kullanıcılar arası anlaşmazlıklarda taraf değiliz.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">12. Uygulanacak Hukuk</h2>
              <p>
                Bu Kullanım Koşulları, Türkiye Cumhuriyeti kanunlarına tabidir. Uyuşmazlıklar Trabzon mahkemelerinde 
                çözülecektir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">13. Değişiklikler</h2>
              <p>
                RideYo, bu Kullanım Koşullarını dilediği zaman değiştirme hakkını saklı tutar. Önemli değişiklikler 
                kullanıcılara bildirilecektir. Değişikliklerden sonra platformu kullanmaya devam etmeniz, yeni koşulları 
                kabul ettiğiniz anlamına gelir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">14. İletişim</h2>
              <p>
                Kullanım Koşulları hakkında sorularınız için:
              </p>
              <p className="mt-3">
                <strong>E-posta:</strong> destek@ride-yo.com<br />
                <strong>Telefon:</strong> +90 (462) 123 45 67<br />
                <strong>Adres:</strong> Atatürk Alanı, Devlet Sahil Yolu Cd., Trabzon, Türkiye
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;



import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-6">Gizlilik Politikası</h1>
          <p className="text-muted-foreground mb-8">Son Güncelleme: 23 Ekim 2024</p>
          
          <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Giriş</h2>
              <p>
                RideYo olarak, kullanıcılarımızın gizliliğini korumayı taahhüt ediyoruz. Bu Gizlilik Politikası, 
                kişisel verilerinizi nasıl topladığımızı, kullandığımızı, sakladığımızı ve koruduğumuzu açıklamaktadır.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Toplanan Bilgiler</h2>
              <h3 className="text-xl font-semibold text-foreground mb-3">2.1 Kişisel Bilgiler</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Ad, soyad</li>
                <li>E-posta adresi</li>
                <li>Telefon numarası</li>
                <li>Kredi kartı bilgileri (şifreli olarak)</li>
                <li>Ehliyet bilgileri</li>
                <li>Adres bilgileri</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-4">2.2 Otomatik Toplanan Bilgiler</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>IP adresi</li>
                <li>Tarayıcı türü ve sürümü</li>
                <li>Cihaz bilgileri</li>
                <li>Konum bilgileri (izniniz dahilinde)</li>
                <li>Platform kullanım verileri</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Bilgilerin Kullanımı</h2>
              <p>Topladığımız bilgileri şu amaçlarla kullanırız:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li>Araç kiralama hizmetlerini sağlamak</li>
                <li>Ödeme işlemlerini gerçekleştirmek</li>
                <li>Müşteri desteği sunmak</li>
                <li>Platformu geliştirmek ve iyileştirmek</li>
                <li>Güvenlik ve dolandırıcılık önleme</li>
                <li>Yasal yükümlülükleri yerine getirmek</li>
                <li>Size özel teklifler ve bildirimler göndermek (izniniz dahilinde)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Bilgi Paylaşımı</h2>
              <p>Kişisel bilgilerinizi şu durumlarda üçüncü taraflarla paylaşabiliriz:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li>Araç sahipleri ile kiralama işlemlerinin gerçekleştirilmesi için</li>
                <li>Ödeme işlemcileri ile güvenli ödeme altyapısı için</li>
                <li>Yasal zorunluluklar gereği resmi makamlarla</li>
                <li>Hizmet sağlayıcılar ile platform işletimi için</li>
              </ul>
              <p className="mt-3">
                Bilgileriniz hiçbir zaman pazarlama amaçlı üçüncü taraflara satılmaz veya kiralanmaz.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Veri Güvenliği</h2>
              <p>
                Kişisel verilerinizi korumak için endüstri standardı güvenlik önlemleri kullanırız:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li>SSL/TLS şifreleme</li>
                <li>Güvenli veri depolama</li>
                <li>Düzenli güvenlik denetimleri</li>
                <li>Sınırlı erişim kontrolleri</li>
                <li>Güçlü şifreleme protokolleri</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Çerezler (Cookies)</h2>
              <p>
                Web sitemiz, kullanıcı deneyimini iyileştirmek için çerezler kullanır. Çerezler, tarayıcınız 
                tarafından depolanan küçük metin dosyalarıdır. Çerez tercihlerinizi tarayıcı ayarlarınızdan 
                yönetebilirsiniz.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Haklarınız</h2>
              <p>KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                <li>İşlenmişse buna ilişkin bilgi talep etme</li>
                <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
                <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
                <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
                <li>Silme veya yok edilmesini isteme</li>
                <li>İşlenen verilerin münhasıran otomatik sistemler ile analiz edilmesi suretiyle aleyhinize 
                bir sonucun ortaya çıkmasına itiraz etme</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Çocukların Gizliliği</h2>
              <p>
                Hizmetlerimiz 18 yaş altı bireyler için tasarlanmamıştır. Bilerek 18 yaş altı bireylerden 
                kişisel bilgi toplamıyoruz.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Değişiklikler</h2>
              <p>
                Bu Gizlilik Politikası zaman zaman güncellenebilir. Önemli değişiklikler olduğunda, 
                size e-posta veya platform üzerinden bildirimde bulunacağız.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. İletişim</h2>
              <p>
                Gizlilik Politikamız hakkında sorularınız için:
              </p>
              <p className="mt-3">
                <strong>E-posta:</strong> gizlilik@ride-yo.com<br />
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

export default Privacy;



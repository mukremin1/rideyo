import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <h1 className="text-4xl font-bold mb-8 text-foreground">Çerez Politikası</h1>
        
        <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Çerez Nedir?</h2>
            <p>
              Çerezler, ziyaret ettiğiniz internet siteleri tarafından tarayıcılar aracılığıyla 
              cihazınıza veya ağ sunucusuna depolanan küçük metin dosyalarıdır. RideYo olarak 
              web sitemizde ve mobil uygulamamızda çeşitli çerezler kullanmaktayız.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Çerez Türleri</h2>
            
            <h3 className="text-xl font-semibold text-foreground mb-2">2.1. Zorunlu Çerezler</h3>
            <p>
              Web sitesinin düzgün çalışması için gerekli olan çerezlerdir. Güvenlik, ağ yönetimi 
              ve erişilebilirlik gibi temel işlevleri sağlar.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-2">2.2. İşlevsellik Çerezleri</h3>
            <p>
              Kullanıcı tercihlerini hatırlayarak daha kişiselleştirilmiş bir deneyim sunar. 
              Dil seçimi, tema tercihleri gibi bilgileri saklar.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-2">2.3. Performans ve Analitik Çerezleri</h3>
            <p>
              Web sitesinin performansını ölçmek ve iyileştirmek için kullanılır. Hangi sayfaların 
              ziyaret edildiği, ne kadar süre kalındığı gibi anonim veriler toplar.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-2">2.4. Hedefleme ve Reklam Çerezleri</h3>
            <p>
              Kullanıcıların ilgi alanlarına göre özelleştirilmiş reklamlar göstermek için kullanılır.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Kullandığımız Çerezler</h2>
            <div className="bg-muted p-4 rounded-lg">
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Oturum Çerezleri:</strong> Giriş yapmış kullanıcıların kimlik doğrulaması</li>
                <li><strong>Tercih Çerezleri:</strong> Dil, tema ve görünüm tercihleri</li>
                <li><strong>Güvenlik Çerezleri:</strong> Dolandırıcılık tespiti ve güvenlik</li>
                <li><strong>Analitik Çerezleri:</strong> Kullanım istatistikleri ve performans ölçümü</li>
                <li><strong>GPS Çerezleri:</strong> Konum bazlı hizmetler için</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Çerez Yönetimi</h2>
            <p>
              Tarayıcı ayarlarınızdan çerezleri kontrol edebilir, silebilir veya engelleyebilirsiniz. 
              Ancak bazı çerezleri devre dışı bırakmanız durumunda web sitesinin bazı özellikleri 
              düzgün çalışmayabilir.
            </p>
            
            <h3 className="text-xl font-semibold text-foreground mb-2">Popüler Tarayıcılarda Çerez Yönetimi:</h3>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Google Chrome:</strong> Ayarlar → Gizlilik ve güvenlik → Çerezler ve diğer site verileri</li>
              <li><strong>Mozilla Firefox:</strong> Ayarlar → Gizlilik ve Güvenlik → Çerezler ve Site Verileri</li>
              <li><strong>Safari:</strong> Tercihler → Gizlilik → Çerezleri ve web sitesi verilerini yönet</li>
              <li><strong>Microsoft Edge:</strong> Ayarlar → Gizlilik, arama ve hizmetler → Çerezler</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Üçüncü Taraf Çerezleri</h2>
            <p>
              Web sitemizde bazı üçüncü taraf hizmet sağlayıcılar (ödeme sistemleri, harita servisleri, 
              analitik araçlar) kendi çerezlerini kullanabilir. Bu çerezler ilgili şirketlerin gizlilik 
              politikalarına tabidir.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Çerez Politikası Güncellemeleri</h2>
            <p>
              Bu çerez politikası zaman zaman güncellenebilir. Önemli değişiklikler olduğunda 
              sizi bilgilendireceğiz. Politikadaki değişiklikler yayınlandığı tarihten itibaren 
              geçerli olacaktır.
            </p>
            <p className="mt-2">
              <strong>Son Güncelleme:</strong> {new Date().toLocaleDateString('tr-TR')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. İletişim</h2>
            <p>
              Çerez politikamız hakkında sorularınız için bizimle iletişime geçebilirsiniz:
            </p>
            <div className="bg-muted p-4 rounded-lg mt-2">
              <p><strong>E-posta:</strong> info@ride-yo.com</p>
              <p><strong>Telefon:</strong> +90 (462) 123 45 67</p>
              <p><strong>Adres:</strong> Trabzon, Türkiye</p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CookiePolicy;

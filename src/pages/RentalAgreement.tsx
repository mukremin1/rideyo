import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FileText } from "lucide-react";

const RentalAgreement = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-10 h-10 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">Mesafeli Satış Sözleşmesi</h1>
        </div>
        
        <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
          <section className="bg-muted p-6 rounded-lg">
            <p className="text-sm">
              İşbu Mesafeli Satış Sözleşmesi ("Sözleşme"), 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve 
              Mesafeli Sözleşmeler Yönetmeliği hükümleri uyarınca, RideYo platformu üzerinden araç kiralayan 
              ("Kiracı/Tüketici") ile araç sahibi ("Kiraya Veren/Satıcı") arasında aşağıdaki şartlar dahilinde 
              akdedilmiştir.
            </p>
            <p className="text-sm mt-2">
              <strong>Son Güncelleme:</strong> {new Date().toLocaleDateString('tr-TR')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Madde 1: Taraflar</h2>
            
            <div className="bg-card p-4 rounded-lg border mb-4">
              <h3 className="text-xl font-semibold text-foreground mb-2">1.1. Satıcı/Hizmet Sağlayıcı Bilgileri</h3>
              <ul className="list-none space-y-1">
                <li><strong>Ünvanı:</strong> RideYo Araç Kiralama Hizmetleri</li>
                <li><strong>Adres:</strong> Müftü Solakzade Mah. Elmadağ Sk. No:2 Kat:2 Palandöken/Erzurum</li>
                <li><strong>Telefon:</strong> 0539 526 32 93</li>
                <li><strong>E-posta:</strong> info@ride-yo.com</li>
                <li><strong>Web Sitesi:</strong> www.ride-yo.com</li>
              </ul>
            </div>

            <div className="bg-card p-4 rounded-lg border">
              <h3 className="text-xl font-semibold text-foreground mb-2">1.2. Alıcı/Tüketici</h3>
              <p>
                RideYo platformu üzerinden araç kiralayan, geçerli sürücü belgesi olan ve 
                platform şartlarını kabul eden gerçek kişi. Alıcı bilgileri rezervasyon sırasında 
                kayıt altına alınmaktadır.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Madde 2: Sözleşme Konusu</h2>
            <p>
              İşbu sözleşmenin konusu, Alıcı'nın Satıcı'ya ait RideYo elektronik ticaret platformu üzerinden 
              elektronik ortamda siparişini verdiği araç kiralama hizmetinin satışı ve teslimi ile ilgili 
              olarak 6502 sayılı Tüketicinin Korunması Hakkındaki Kanun ve Mesafeli Sözleşmeler Yönetmeliği 
              hükümleri gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Madde 3: Hizmet Bilgileri ve Fiyatlar</h2>
            
            <div className="space-y-4">
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="text-xl font-semibold text-foreground mb-2">3.1. Hizmet Özellikleri</h3>
                <ul className="list-disc list-inside space-y-2 ml-6">
                  <li>Hizmetin türü, marka, model, renk ve tüm özellikleri platformda belirtilmiştir</li>
                  <li>Kiralama süresi dakika, saat veya gün bazlı olabilir</li>
                  <li>Kilometre paketleri ayrıca belirtilebilir</li>
                  <li>Vergiler dahil toplam fiyat rezervasyon öncesi gösterilmektedir</li>
                </ul>
              </div>

              <div className="bg-card p-4 rounded-lg border">
                <h3 className="text-xl font-semibold text-foreground mb-2">3.2. Fiyatlandırma</h3>
                <ul className="list-disc list-inside space-y-2 ml-6">
                  <li>Tüm fiyatlar KDV dahil Türk Lirası (TL) olarak belirtilmiştir</li>
                  <li>Platform komisyon ücreti kiralama bedelinin %15'idir</li>
                  <li>Geç iade durumunda saatlik ücret uygulanır</li>
                  <li>Hasar durumunda ek ücretler söz konusu olabilir</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Madde 4: Ödeme Şekli ve Koşulları</h2>
            
            <div className="bg-card p-4 rounded-lg border">
              <ul className="list-disc list-inside space-y-2 ml-6">
                <li>Ödeme, kredi kartı veya banka kartı ile yapılabilir</li>
                <li>Kiralama bedeli rezervasyon onayı sırasında tahsil edilir</li>
                <li>Tüm ödemeler güvenli ödeme altyapısı üzerinden gerçekleştirilir</li>
                <li>Kart bilgileri 256-bit SSL sertifikası ile şifrelenir</li>
                <li>Kart bilgileri kaydedilebilir (opsiyonel)</li>
                <li>Depozito tutarı araç tipine göre 500-2000 TL arasında değişir</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Madde 5: Hizmetin İfası ve Teslim</h2>
            
            <div className="space-y-4">
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="text-xl font-semibold text-foreground mb-2">5.1. Teslim Şartları</h3>
                <ul className="list-disc list-inside space-y-2 ml-6">
                  <li>Araç, belirtilen tarih ve saatte belirlenen lokasyonda teslim edilir</li>
                  <li>Teslim öncesi araç kontrol formu doldurulur</li>
                  <li>Mevcut hasarlar fotoğraflanır ve kayda alınır</li>
                  <li>Yakıt seviyesi ve kilometre bilgisi kayıt altına alınır</li>
                </ul>
              </div>

              <div className="bg-card p-4 rounded-lg border">
                <h3 className="text-xl font-semibold text-foreground mb-2">5.2. İade Şartları</h3>
                <ul className="list-disc list-inside space-y-2 ml-6">
                  <li>Araç, kira süresinin bitiminde temiz olarak iade edilir</li>
                  <li>Yakıt seviyesi başlangıç seviyesine getirilir</li>
                  <li>Hasar kontrolü yapılır ve raporlanır</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Madde 6: Cayma Hakkı</h2>
            
            <div className="bg-card p-4 rounded-lg border border-primary/20">
              <p className="mb-4">
                6502 sayılı Kanun'un 50. maddesi ve Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi gereğince, 
                belirli bir tarihte veya dönemde yapılması gereken konaklama, eşya taşıma, araba kiralama, 
                yiyecek-içecek tedariki ve eğlence veya dinlenme amacıyla yapılan boş zamanın değerlendirilmesine 
                ilişkin sözleşmelerde tüketicinin cayma hakkı bulunmamaktadır.
              </p>
              <p className="font-semibold text-foreground">
                Ancak RideYo olarak müşteri memnuniyeti kapsamında aşağıdaki iptal politikası uygulanmaktadır:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-6 mt-4">
                <li><strong>24 saat öncesine kadar iptal:</strong> %100 iade</li>
                <li><strong>12-24 saat arası iptal:</strong> %50 iade</li>
                <li><strong>12 saatten az süre kala iptal:</strong> İade yapılmaz</li>
                <li><strong>Gelmeme (No-show):</strong> İade yapılmaz</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Madde 7: Garanti ve Sorumluluk</h2>
            
            <div className="space-y-4">
              <div className="bg-card p-4 rounded-lg border">
                <h3 className="text-xl font-semibold text-foreground mb-2">7.1. Sigorta Kapsamı</h3>
                <ul className="list-disc list-inside space-y-2 ml-6">
                  <li>Zorunlu Trafik Sigortası (ZTS)</li>
                  <li>Mini Kasko (RideYo tarafından sağlanır)</li>
                  <li>Yolcu Ferdi Kaza Sigortası</li>
                  <li>7/24 Yol Yardım Hizmeti</li>
                </ul>
              </div>

              <div className="bg-card p-4 rounded-lg border border-red-500/20">
                <h3 className="text-xl font-semibold text-red-500 mb-2">7.2. Sorumluluk Sınırları</h3>
                <ul className="list-disc list-inside space-y-2 ml-6">
                  <li>Alkol veya uyuşturucu etkisinde kullanım sigorta kapsamı dışındadır</li>
                  <li>Ehliyet olmadan veya süresi dolmuş ehliyet ile kullanım yasaktır</li>
                  <li>Kasıtlı hasar tüketicinin sorumluluğundadır</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Madde 8: Kişisel Verilerin Korunması</h2>
            <p>
              Tüketiciye ait kişisel veriler, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında 
              işlenmekte ve korunmaktadır. Detaylı bilgi için Gizlilik Politikası ve KVKK Aydınlatma Metni'ne 
              başvurulabilir.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Madde 9: Uyuşmazlık Çözümü</h2>
            
            <div className="bg-card p-4 rounded-lg border">
              <ul className="list-disc list-inside space-y-2 ml-6">
                <li>Bu sözleşmeden doğan uyuşmazlıklarda Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir</li>
                <li>Parasal sınırlar her yıl Ticaret Bakanlığı tarafından belirlenmektedir</li>
                <li>Erzurum mahkemeleri ve icra daireleri yetkilidir</li>
                <li>Türkiye Cumhuriyeti kanunları uygulanır</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Madde 10: Yürürlük</h2>
            <p>
              İşbu sözleşme, Tüketici tarafından elektronik ortamda onaylanması ile birlikte yürürlüğe girer. 
              Tüketici, sözleşme konusu hizmeti sipariş etmekle işbu sözleşmenin tüm maddelerini kabul etmiş 
              sayılır.
            </p>
          </section>

          <section className="bg-muted p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Satıcı/Hizmet Sağlayıcı İletişim Bilgileri</h2>
            <div className="space-y-1">
              <p><strong>RideYo Araç Kiralama Hizmetleri</strong></p>
              <p>Adres: Müftü Solakzade Mah. Elmadağ Sk. No:2 Kat:2 Palandöken/Erzurum</p>
              <p>Telefon: 0539 526 32 93</p>
              <p>E-posta: info@ride-yo.com</p>
              <p>Web: www.ride-yo.com</p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RentalAgreement;


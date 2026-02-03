import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const KVKK = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-6">KVKK Aydınlatma Metni</h1>
          <p className="text-muted-foreground mb-8">Kişisel Verilerin Korunması Kanunu Uyarınca Bilgilendirme</p>
          
          <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Veri Sorumlusu</h2>
              <p>
                6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel verileriniz; 
                veri sorumlusu olarak RideYo tarafından aşağıda açıklanan kapsamda işlenebilecektir.
              </p>
              <p className="mt-3">
                <strong>Şirket Unvanı:</strong> RideYo Teknoloji A.Ş.<br />
                <strong>Adres:</strong> Atatürk Alanı, Devlet Sahil Yolu Cd., Trabzon<br />
                <strong>E-posta:</strong> kvkk@ride-yo.com
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. İşlenen Kişisel Veriler</h2>
              <h3 className="text-xl font-semibold text-foreground mb-3">2.1 Kimlik Bilgileri</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Ad, soyad</li>
                <li>T.C. kimlik numarası</li>
                <li>Doğum tarihi</li>
                <li>Ehliyet numarası ve bilgileri</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-4">2.2 İletişim Bilgileri</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>E-posta adresi</li>
                <li>Telefon numarası</li>
                <li>Adres bilgileri</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-4">2.3 Finansal Bilgiler</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Kredi kartı bilgileri (şifreli)</li>
                <li>Banka hesap bilgileri (araç sahipleri için)</li>
                <li>İşlem geçmişi</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-4">2.4 Araç ve Kiralama Bilgileri</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Kiralanan araç bilgileri</li>
                <li>Kiralama tarihleri ve süreleri</li>
                <li>Araç resimleri ve açıklamaları</li>
                <li>Konum bilgileri</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-4">2.5 İşlem Güvenliği Bilgileri</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>IP adresi</li>
                <li>Çerez kayıtları</li>
                <li>Cihaz bilgileri</li>
                <li>Log kayıtları</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Kişisel Verilerin İşlenme Amaçları</h2>
              <p>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li>Araç kiralama hizmetlerinin sunulması</li>
                <li>Kullanıcı hesabı oluşturma ve yönetimi</li>
                <li>Ödeme işlemlerinin gerçekleştirilmesi</li>
                <li>Müşteri ilişkileri yönetimi ve destek hizmetleri</li>
                <li>Güvenlik ve dolandırıcılık önleme</li>
                <li>Yasal yükümlülüklerin yerine getirilmesi</li>
                <li>Platform geliştirme ve iyileştirme</li>
                <li>İstatistiksel analiz ve raporlama</li>
                <li>Pazarlama ve tanıtım faaliyetleri (açık rızanız dahilinde)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Kişisel Verilerin Aktarılması</h2>
              <p>Kişisel verileriniz, yukarıda belirtilen amaçlar doğrultusunda:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li>Araç sahipleri ile (kiralama işlemleri için)</li>
                <li>Ödeme kuruluşları ile (ödeme işlemleri için)</li>
                <li>Hukuk firmaları ile (hukuki süreçler için)</li>
                <li>Yetkili kamu kurum ve kuruluşları ile (yasal zorunluluklar için)</li>
                <li>İş ortakları ve hizmet sağlayıcılar ile (platform operasyonları için)</li>
              </ul>
              <p className="mt-3">
                aktarılabilecektir. Aktarımlar KVKK'nın 8. ve 9. maddelerine uygun olarak gerçekleştirilmektedir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Kişisel Veri Toplanma Yöntemi</h2>
              <p>Kişisel verileriniz:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li>Web sitesi ve mobil uygulama üzerinden</li>
                <li>Kayıt ve üyelik formları aracılığıyla</li>
                <li>Kiralama işlemleri sırasında</li>
                <li>E-posta, telefon ve diğer iletişim kanalları üzerinden</li>
                <li>Otomatik sistemler (çerezler, loglar) aracılığıyla</li>
              </ul>
              <p className="mt-3">toplanmaktadır.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Kişisel Veri Sahibinin Hakları</h2>
              <p>KVKK'nın 11. maddesi uyarınca, kişisel veri sahipleri olarak aşağıdaki haklara sahipsiniz:</p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
                <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
                <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme</li>
                <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme</li>
                <li>KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme</li>
                <li>Yapılan düzeltme, silme ve yok etme işlemlerinin, kişisel verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
                <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
                <li>Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Haklarınızı Kullanma</h2>
              <p>
                Yukarıda belirtilen haklarınızı kullanmak için kimliğinizi tespit edici gerekli bilgiler ile 
                KVKK'nın 11. maddesinde belirtilen haklardan kullanmayı talep ettiğiniz hakkınıza yönelik 
                açıklamalarınızı içeren talebinizi aşağıdaki yöntemlerle iletebilirsiniz:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-3">
                <li>
                  <strong>Yazılı olarak:</strong> Atatürk Alanı, Devlet Sahil Yolu Cd., Trabzon adresine 
                  ıslak imzalı başvuru dilekçenizi şahsen veya noter kanalıyla göndererek
                </li>
                <li>
                  <strong>E-posta ile:</strong> kvkk@ride-yo.com adresine kayıtlı elektronik posta (KEP) 
                  adresi, güvenli elektronik imza veya mobil imza ile imzalanmış başvuru göndererek
                </li>
              </ul>
              <p className="mt-3">
                Başvurularınız, talebin niteliğine göre en geç 30 gün içinde ücretsiz olarak 
                sonuçlandırılacaktır. İşlemin ayrıca bir maliyeti gerektirmesi hâlinde, tarafımızca 
                Kişisel Verileri Koruma Kurulu tarafından belirlenen tarifedeki ücret alınabilir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Veri Güvenliği</h2>
              <p>
                RideYo olarak, kişisel verilerinizin güvenliğini sağlamak için teknik ve idari tedbirler 
                almaktayız. Verileriniz, yetkisiz erişime, kaybolmaya, kötüye kullanıma karşı korunmaktadır.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Değişiklikler</h2>
              <p>
                Bu aydınlatma metni, yasal düzenlemelerdeki değişiklikler veya şirket politikalarındaki 
                güncellemeler doğrultusunda değiştirilebilir. Önemli değişiklikler size bildirilecektir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. İletişim</h2>
              <p>
                KVKK ve kişisel verilerinizin işlenmesi hakkında sorularınız için:
              </p>
              <p className="mt-3">
                <strong>E-posta:</strong> kvkk@ride-yo.com<br />
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

export default KVKK;



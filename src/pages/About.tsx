import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-6">Hakkımızda</h1>
          
          <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
            <p>
              RideYo, Türkiye'nin en yenilikçi araç paylaşım platformudur. 2024 yılında kurulan şirketimiz, 
              insanların araçlarını daha verimli kullanmalarını ve araç sahiplerinin araçlarından gelir elde 
              etmelerini sağlamak misyonuyla yola çıktı.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Vizyonumuz</h2>
            <p>
              Şehir içi ulaşımı daha sürdürülebilir, ekonomik ve esnek hale getirerek, herkesin ihtiyacı 
              olduğunda güvenilir bir araca erişebileceği bir ekosistem yaratmak.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Misyonumuz</h2>
            <p>
              Teknoloji ve güven odaklı yaklaşımımızla, araç sahipleri ve kiralayıcılar arasında 
              güvenli bir köprü kurmak. Kullanıcılarımıza dakikalık, saatlik ve günlük esnek kiralama 
              seçenekleri sunarak, herkesin bütçesine uygun çözümler sunmak.
            </p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Değerlerimiz</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Güven:</strong> Platform üzerindeki tüm kullanıcılarımızın güvenliği önceliğimizdir.</li>
              <li><strong>Şeffaflık:</strong> Net fiyatlandırma ve açık iletişim politikamız vardır.</li>
              <li><strong>Sürdürülebilirlik:</strong> Araç paylaşımını teşvik ederek karbon ayak izini azaltıyoruz.</li>
              <li><strong>İnovasyon:</strong> Sürekli gelişen teknolojimizle en iyi deneyimi sunuyoruz.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Nasıl Çalışıyoruz?</h2>
            <p>
              RideYo, araç sahiplerinin kullanmadıkları araçlarını platform üzerinden kiraya vermesini 
              sağlıyor. Kiralayıcılar ise dakika, saat veya gün bazında ihtiyaçlarına uygun araçları 
              kolayca kiralayabiliyor. Tüm işlemler dijital ortamda, güvenli ödeme altyapımızla gerçekleşiyor.
            </p>

            <p className="mt-8">
              Trabzon'da başlayan hikayemiz, yakında tüm Türkiye'ye yayılacak. Siz de bu yolculuğun 
              bir parçası olun!
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;

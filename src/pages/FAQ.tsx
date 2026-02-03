import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const generalFaqs = [
    {
      question: "RideYo nasıl çalışır?",
      answer: "RideYo, araç sahiplerinin kullanmadıkları araçlarını kiraya vermesini sağlayan bir platformdur. Kullanıcılar dakika, saat veya gün bazında araç kiralayabilir. Tüm işlemler uygulama üzerinden güvenli bir şekilde gerçekleşir."
    },
    {
      question: "Hangi şehirlerde hizmet veriyorsunuz?",
      answer: "Şu anda Trabzon'da hizmet vermekteyiz. Yakında İstanbul, Ankara, İzmir ve diğer büyük şehirlere de açılmayı planlıyoruz."
    },
    {
      question: "Ödeme güvenli mi?",
      answer: "Evet, tüm ödemeler güvenli ödeme altyapımız üzerinden gerçekleşir. Kredi kartı bilgileriniz şifrelenerek saklanır ve PCI-DSS standartlarına uygun işlem yapılır."
    },
    {
      question: "Mobil uygulama var mı?",
      answer: "Evet! RideYo hem iOS hem de Android cihazlarda kullanılabilen bir mobil uygulamaya sahiptir. Ayrıca web tarayıcısından da erişim sağlayabilirsiniz."
    }
  ];

  const renterFaqs = [
    {
      question: "Araç kiralamak için ne yapmalıyım?",
      answer: "Öncelikle bir hesap oluşturup kimlik doğrulaması yapmanız gerekiyor. Ardından uygulama üzerinden uygun bir araç seçip, kiralama süresini belirleyebilir ve ödeme yapabilirsiniz. Rezervasyonunuz onaylandıktan sonra araç bilgilerine erişebilirsiniz."
    },
    {
      question: "Kiralama için hangi belgeler gerekli?",
      answer: "Geçerli bir kimlik belgesi ve en az 2 yıllık sürücü belgesi gerekmektedir. Yaşınız 21-70 arasında olmalı, sürücü puanınız minimum 60 olmalıdır. Tüm belgeler uygulama üzerinden yüklenir ve doğrulanır."
    },
    {
      question: "Fiyatlandırma nasıl yapılıyor?",
      answer: "Her araç için dakikalık, saatlik ve günlük fiyatlar belirlenmiştir. Kiralama sürenize göre otomatik olarak hesaplama yapılır. Dakikalık kiralama için provizyon çekilir ve sadece kullandığınız süre kadar ücret alınır. Ayrıca kilometre paketleri de mevcuttur."
    },
    {
      question: "Minimum kiralama süresi var mı?",
      answer: "Dakikalık kiralama için minimum 30 dakika, saatlik kiralama için minimum 1 saat, günlük kiralama için minimum 1 gün süre bulunmaktadır. Uzun süreli kiralamalar için indirimli fiyatlar uygulanır."
    },
    {
      question: "İptal politikası nedir?",
      answer: "Kiralama başlangıcından 24 saat öncesine kadar ücretsiz iptal yapabilirsiniz. 12-24 saat arası iptallerde %50 iade, 12 saatten kısa sürede iptal durumunda iade yapılmaz. No-show (gelmeme) durumunda da iade yapılmaz."
    },
    {
      question: "Araç teslim ve iade nasıl yapılır?",
      answer: "Araç sahibi ile koordine ederek belirlenen lokasyonda teslim alma ve iade işlemlerini gerçekleştirirsiniz. Teslim sırasında araç kontrol formu doldurulur, mevcut hasarlar fotoğraflanır. İade sırasında da aynı kontroller yapılır."
    },
    {
      question: "Kaza durumunda ne olur?",
      answer: "Tüm araçlar sigorta ile korunmaktadır. Kaza durumunda derhal RideYo destek hattını (7/24) aramanız, polis ve trafik ekiplerini bilgilendirmeniz gerekmektedir. Kaza tespit tutanağı düzenlenir, sigorta süreci RideYo tarafından yönetilir."
    },
    {
      question: "Yakıt maliyeti kime ait?",
      answer: "Yakıt maliyeti kiracıya aittir. Araç teslim alındığında ki yakıt seviyesi ile aynı seviyede teslim edilmelidir. Eksik yakıt durumunda ek ücret alınır."
    },
    {
      question: "Trafik cezaları ne olur?",
      answer: "Kiralama süresi içinde oluşan trafik cezaları kiracıya aittir. Ceza tebligatı araç sahibine gelir ve kiracı 15 gün içinde RideYo'ya ödeme yapar. Ödeme yapılmaması durumunda depozito kullanılır."
    },
    {
      question: "Sürücü puanı nedir ve nasıl hesaplanır?",
      answer: "Sürücü puanı, kiralama geçmişinize, yorumlarınıza, ceza puanınıza ve trafik geçmişinize göre hesaplanan bir değerlendirmedir. Yüksek puan daha iyi kiralama fırsatları sağlar. Puanınızı profil sayfanızdan takip edebilirsiniz."
    }
  ];

  const ownerFaqs = [
    {
      question: "Aracımı nasıl kiraya verebilirim?",
      answer: "Araç sahibi hesabı oluşturarak başlayabilirsiniz. 'Araç Ekle' sayfasından aracınızın bilgilerini, fotoğraflarını, belgelerini ve fiyatlarını girerek kiraya verebilirsiniz. Araçlarınızı istediğiniz zaman müsait veya müsait değil olarak işaretleyebilirsiniz."
    },
    {
      question: "Hangi belgeler gerekli?",
      answer: "Araç ruhsatı, trafik sigortası, kasko (isteğe bağlı), kimlik belgesi ve araç fotoğrafları gereklidir. Tüm belgeler güncel olmalı ve sistem üzerinden yüklenmelidir."
    },
    {
      question: "Ne kadar kazanabilirim?",
      answer: "Kazançlar araç tipine, fiyatlandırmaya ve kiralama sıklığına bağlıdır. Ortalama olarak kompakt araçlar ayda 12,000 TL, sedanlar 16,800 TL, SUV'lar 24,000 TL kazanç sağlar. RideYo %15 komisyon ücreti alır."
    },
    {
      question: "Sigorta durumu nasıl?",
      answer: "Tüm kiralamalar RideYo Mini Kasko ile korunur. Kendi kasko poliçeniz varsa ek koruma sağlar. Zorunlu Trafik Sigortası (ZTS) her araçta olmalıdır. Sigorta kapsamı dışı durumlar (alkollü kullanım, kasıtlı hasar vb.) kiracının sorumluluğundadır."
    },
    {
      question: "Ödemeler nasıl ve ne zaman yapılır?",
      answer: "Kiralama bedeli kiracıdan RideYo tarafından tahsil edilir, %15 komisyon kesintisi yapılır. Kalan tutar 7 iş günü içinde hesabınıza aktarılır. Aylık toplu ödeme seçeneği de mevcuttur."
    },
    {
      question: "Aracımı nasıl koruyabilirim?",
      answer: "GPS takip sistemi ile aracınızı anlık izleyebilirsiniz. Teslim öncesi ve sonrası fotoğraf çekilir. Kiracılar kimlik ve ehliyet doğrulamasından geçer. Hasar durumunda depozito güvencesi vardır."
    },
    {
      question: "Rezervasyonları reddetebilir miyim?",
      answer: "Evet, gelen rezervasyon isteklerini değerlendirip kabul veya reddedebilirsiniz. Otomatik kabul de ayarlayabilirsiniz. Ancak sık red durumunda puanınız düşebilir."
    },
    {
      question: "Aracımda hasar oluşursa ne olur?",
      answer: "Hasar durumunda derhal RideYo'yu bilgilendirin. Sigorta kapsamındaki hasarlar sigorta tarafından karşılanır. Kiracı kusurlu ise depozito kullanılır. Onarım süreci RideYo tarafından koordine edilir."
    },
    {
      question: "Vergi durumu nasıl?",
      answer: "Araç kiralama geliri vergiye tabidir. Düzenli kiralama yapıyorsanız gelir vergisi beyannamesi vermeniz gerekebilir. RideYo size aylık gelir raporu sağlar. Muhasebeci ile çalışmanızı öneririz."
    },
    {
      question: "Kiracı seçimi nasıl yapmalıyım?",
      answer: "Kiracının sürücü puanına, yorumlarına, kiralama geçmişine ve kimlik doğrulamasına bakın. Yüksek puanlı (80+) ve düşük ceza puanlı (30 altı) kiracıları tercih edin. İlk kiracılar için daha dikkatli olun."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-4 text-center">Sık Sorulan Sorular</h1>
          <p className="text-muted-foreground text-center mb-12">
            RideYo hakkında merak ettiğiniz her şey
          </p>

          {/* Genel Sorular */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Genel Sorular</h2>
            <Accordion type="single" collapsible className="w-full space-y-4">
              {generalFaqs.map((faq, index) => (
                <AccordionItem key={`general-${index}`} value={`general-${index}`} className="border border-border rounded-lg px-6">
                  <AccordionTrigger className="text-left hover:no-underline">
                    <span className="font-semibold text-foreground">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Kiracılar İçin */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Kiracılar İçin</h2>
            <Accordion type="single" collapsible className="w-full space-y-4">
              {renterFaqs.map((faq, index) => (
                <AccordionItem key={`renter-${index}`} value={`renter-${index}`} className="border border-border rounded-lg px-6">
                  <AccordionTrigger className="text-left hover:no-underline">
                    <span className="font-semibold text-foreground">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Araç Sahipleri İçin */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Araç Sahipleri İçin</h2>
            <Accordion type="single" collapsible className="w-full space-y-4">
              {ownerFaqs.map((faq, index) => (
                <AccordionItem key={`owner-${index}`} value={`owner-${index}`} className="border border-border rounded-lg px-6">
                  <AccordionTrigger className="text-left hover:no-underline">
                    <span className="font-semibold text-foreground">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="mt-12 p-6 bg-card border border-border rounded-lg text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Sorunuz burada yok mu?
            </h2>
            <p className="text-muted-foreground mb-4">
              Bizimle iletişime geçmekten çekinmeyin
            </p>
            <a href="/contact" className="text-primary hover:underline">
              İletişim sayfasına git →
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;

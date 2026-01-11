import { Car, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

const WHATSAPP_NUMBER = "+905395263293";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-8">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src="/logo-512x512.png" alt="RideYo logo" className="w-10 h-10 rounded-md object-contain" />
              <span className="text-xl font-bold text-foreground">RideYo</span>
            </Link>
            <p className="text-muted-foreground text-sm">
              Türkiye'nin en hızlı ve kolay araç kiralama platformu
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Şirket</h3>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Hakkımızda</Link></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors text-sm">İletişim</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Destek</h3>
            <ul className="space-y-2">
              <li><Link to="/faq" className="text-muted-foreground hover:text-foreground transition-colors text-sm">SSS</Link></li>
              <li><Link to="/support" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Müşteri Hizmetleri</Link></li>
              <li>
                <a 
                  href={`https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent("Merhaba, RideYo hakkında bilgi almak istiyorum.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp Destek
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Araç Sahipleri</h3>
            <ul className="space-y-2">
              <li><Link to="/owner-dashboard" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Sahip Paneli</Link></li>
              <li><Link to="/earnings-calculator" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Kazanç Hesaplayıcı</Link></li>
              <li><Link to="/car-comparison" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Araç Karşılaştırma</Link></li>
              <li><Link to="/availability-calendar" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Müsaitlik Takvimi</Link></li>
              <li><Link to="/owner-guide" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Rehber</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Kaynaklar</h3>
            <ul className="space-y-2">
              <li><Link to="/safety-guidelines" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Güvenlik Kuralları</Link></li>
              <li><Link to="/rental-agreement" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Kiralama Sözleşmesi</Link></li>
              <li><Link to="/faq" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Sık Sorulan Sorular</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Yasal</h3>
            <ul className="space-y-2">
              <li><Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Gizlilik Politikası</Link></li>
              <li><Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Kullanım Koşulları</Link></li>
              <li><Link to="/kvkk" className="text-muted-foreground hover:text-foreground transition-colors text-sm">KVKK</Link></li>
              <li><Link to="/cookie-policy" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Çerez Politikası</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 RideYo Tüm hakları saklıdır</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

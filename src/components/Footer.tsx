import { Car, MessageSquare, Smartphone } from "lucide-react";
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
            <p className="text-muted-foreground text-sm mb-4">
              Türkiye'nin en hızlı ve kolay araç kiralama platformu
            </p>
            
            {/* Mobile App Links */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Mobil Uygulamamız
              </p>
              <div className="flex flex-col gap-2">
                <a 
                  href="https://apps.apple.com/app/rideyo" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-black text-white px-3 py-2 rounded-lg text-xs hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <span>App Store</span>
                </a>
                <a 
                  href="https://play.google.com/store/apps/details?id=com.rideyo" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-black text-white px-3 py-2 rounded-lg text-xs hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <span>Google Play</span>
                </a>
              </div>
            </div>
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

        {/* Payment Methods */}
        <div className="border-t border-border pt-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <span className="text-sm text-muted-foreground">Güvenli Ödeme Yöntemleri:</span>
            <div className="flex items-center gap-4">
              {/* Visa */}
              <div className="bg-white rounded px-3 py-1.5 shadow-sm">
                <svg className="h-6 w-10" viewBox="0 0 48 32" fill="none">
                  <rect width="48" height="32" rx="4" fill="white"/>
                  <path d="M19.5 21.5H16.5L18.5 10.5H21.5L19.5 21.5Z" fill="#00579F"/>
                  <path d="M29 10.7C28.3 10.4 27.2 10.1 25.9 10.1C22.9 10.1 20.8 11.7 20.8 13.9C20.8 15.6 22.3 16.5 23.5 17.1C24.7 17.7 25.1 18.1 25.1 18.6C25.1 19.4 24.1 19.8 23.2 19.8C21.9 19.8 21.2 19.6 20.1 19.1L19.7 18.9L19.3 21.3C20.1 21.7 21.6 22 23.2 22C26.4 22 28.4 20.4 28.4 18C28.4 16.7 27.6 15.7 25.8 14.9C24.7 14.3 24 14 24 13.4C24 12.9 24.5 12.3 25.8 12.3C26.9 12.3 27.7 12.5 28.3 12.8L28.6 12.9L29 10.7Z" fill="#00579F"/>
                  <path d="M33.5 10.5H31.2C30.5 10.5 30 10.7 29.7 11.4L25.3 21.5H28.5L29.1 19.7H33L33.4 21.5H36.2L33.5 10.5ZM30 17.5C30.2 17 31.2 14.3 31.2 14.3C31.2 14.3 31.4 13.7 31.6 13.3L31.8 14.2C31.8 14.2 32.4 16.9 32.5 17.5H30Z" fill="#00579F"/>
                  <path d="M15.1 10.5L12.1 17.9L11.8 16.5C11.2 14.7 9.5 12.7 7.5 11.7L10.2 21.5H13.4L18.3 10.5H15.1Z" fill="#00579F"/>
                  <path d="M10.5 10.5H5.5L5.5 10.7C9.2 11.6 11.6 13.8 12.5 16.5L11.5 11.4C11.4 10.7 10.9 10.5 10.5 10.5Z" fill="#F9A533"/>
                </svg>
              </div>
              
              {/* Mastercard */}
              <div className="bg-white rounded px-3 py-1.5 shadow-sm">
                <svg className="h-6 w-10" viewBox="0 0 48 32" fill="none">
                  <rect width="48" height="32" rx="4" fill="white"/>
                  <circle cx="18" cy="16" r="8" fill="#EB001B"/>
                  <circle cx="30" cy="16" r="8" fill="#F79E1B"/>
                  <path d="M24 10.5C25.9 12 27.1 14.3 27.1 16.9C27.1 19.5 25.9 21.8 24 23.3C22.1 21.8 20.9 19.5 20.9 16.9C20.9 14.3 22.1 12 24 10.5Z" fill="#FF5F00"/>
                </svg>
              </div>
              
              {/* Troy */}
              <div className="bg-white rounded px-3 py-1.5 shadow-sm">
                <svg className="h-6 w-10" viewBox="0 0 48 32" fill="none">
                  <rect width="48" height="32" rx="4" fill="white"/>
                  <path d="M8 13H11V19H8V13Z" fill="#00A0DF"/>
                  <path d="M11 13H15L13 19H11V13Z" fill="#00A0DF"/>
                  <path d="M15 13H19L17 16L19 19H15L13 16L15 13Z" fill="#00A0DF"/>
                  <path d="M23 13C25.2 13 27 14.8 27 17V19H23C20.8 19 19 17.2 19 15C19 13.9 20.1 13 21.5 13H23Z" fill="#0033A0"/>
                  <path d="M27 13H30V19H27V13Z" fill="#0033A0"/>
                  <path d="M31 13H35L33 16V19H31V13Z" fill="#0033A0"/>
                  <path d="M35 13H39V15L37 19H35L37 15V13H35Z" fill="#0033A0"/>
                  <text x="24" y="18" fontSize="6" fontWeight="bold" fill="#0033A0" textAnchor="middle" fontFamily="Arial">TROY</text>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} RideYo Tüm hakları saklıdır</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
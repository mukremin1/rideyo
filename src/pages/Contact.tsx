import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Mesajınız alındı",
      description: "En kısa sürede size dönüş yapacağız.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-12 text-center">İletişim</h1>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-6">Bize Ulaşın</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Adres</h3>
                    <p className="text-muted-foreground">
                      Atatürk Alanı, Devlet Sahil Yolu Cd.<br />
                      Trabzon, Türkiye
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Telefon</h3>
                    <p className="text-muted-foreground">+90 (462) 123 45 67</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">E-posta</h3>
                    <p className="text-muted-foreground">destek@ride-yo.com</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="font-semibold text-foreground mb-4">Çalışma Saatleri</h3>
                <div className="space-y-2 text-muted-foreground">
                  <p>Pazartesi - Cuma: 09:00 - 18:00</p>
                  <p>Cumartesi: 10:00 - 16:00</p>
                  <p>Pazar: Kapalı</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-6">Mesaj Gönderin</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Adınız Soyadınız"
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <Input
                    type="email"
                    placeholder="E-posta Adresiniz"
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <Input
                    type="tel"
                    placeholder="Telefon Numaranız"
                    className="w-full"
                  />
                </div>

                <div>
                  <Input
                    type="text"
                    placeholder="Konu"
                    required
                    className="w-full"
                  />
                </div>

                <div>
                  <Textarea
                    placeholder="Mesajınız"
                    required
                    rows={6}
                    className="w-full"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Gönder
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;



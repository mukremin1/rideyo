import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: t("support.contact.toastTitle"),
      description: t("support.contact.toastDesc"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-12 text-center">{t("support.contact.title")}</h1>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-6">{t("support.contact.reachUs")}</h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{t("support.contact.addressLabel")}</h3>
                    <p className="text-muted-foreground whitespace-pre-line">{t("support.contact.address")}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{t("support.contact.phoneLabel")}</h3>
                    <p className="text-muted-foreground">{t("support.contact.phone")}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{t("support.contact.emailLabel")}</h3>
                    <p className="text-muted-foreground">{t("support.contact.email")}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="font-semibold text-foreground mb-4">{t("support.contact.hoursTitle")}</h3>
                <div className="space-y-2 text-muted-foreground">
                  <p>{t("support.contact.hoursWeekday")}</p>
                  <p>{t("support.contact.hoursSaturday")}</p>
                  <p>{t("support.contact.hoursSunday")}</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-6">{t("support.contact.sendMessage")}</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input type="text" placeholder={t("support.contact.namePlaceholder")} required className="w-full" />
                <Input type="email" placeholder={t("support.contact.emailPlaceholder")} required className="w-full" />
                <Input type="tel" placeholder={t("support.contact.phonePlaceholder")} className="w-full" />
                <Input type="text" placeholder={t("support.contact.subjectPlaceholder")} required className="w-full" />
                <Textarea placeholder={t("support.contact.messagePlaceholder")} required rows={6} className="w-full" />
                <Button type="submit" className="w-full">{t("support.contact.submit")}</Button>
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

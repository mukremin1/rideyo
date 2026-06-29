import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FaqItem = { q: string; a: string };

const FAQ = () => {
  const { t } = useTranslation();

  const generalFaqs = t("support.faq.general", { returnObjects: true }) as FaqItem[];
  const renterFaqs = t("support.faq.renter", { returnObjects: true }) as FaqItem[];
  const ownerFaqs = t("support.faq.owner", { returnObjects: true }) as FaqItem[];

  const renderSection = (title: string, faqs: FaqItem[], prefix: string) => (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-foreground mb-6">{title}</h2>
      <Accordion type="single" collapsible className="w-full space-y-4">
        {faqs.map((faq, index) => (
          <AccordionItem key={`${prefix}-${index}`} value={`${prefix}-${index}`} className="border border-border rounded-lg px-6">
            <AccordionTrigger className="text-left hover:no-underline">
              <span className="font-semibold text-foreground">{faq.q}</span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-4 text-center">{t("support.faq.title")}</h1>
          <p className="text-muted-foreground text-center mb-12">{t("support.faq.subtitle")}</p>

          {renderSection(t("support.faq.generalTitle"), generalFaqs, "general")}
          {renderSection(t("support.faq.renterTitle"), renterFaqs, "renter")}
          {renderSection(t("support.faq.ownerTitle"), ownerFaqs, "owner")}

          <div className="mt-12 p-6 bg-card border border-border rounded-lg text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">{t("support.faq.notFoundTitle")}</h2>
            <p className="text-muted-foreground mb-4">{t("support.faq.notFoundDesc")}</p>
            <a href="/contact" className="text-primary hover:underline">{t("support.faq.contactLink")}</a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;

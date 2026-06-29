import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-6">{t("support.about.title")}</h1>

          <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
            <p>{t("support.about.intro")}</p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">{t("support.about.visionTitle")}</h2>
            <p>{t("support.about.vision")}</p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">{t("support.about.missionTitle")}</h2>
            <p>{t("support.about.mission")}</p>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">{t("support.about.valuesTitle")}</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>{t("support.about.values.trust")}</strong></li>
              <li><strong>{t("support.about.values.transparency")}</strong></li>
              <li><strong>{t("support.about.values.sustainability")}</strong></li>
              <li><strong>{t("support.about.values.innovation")}</strong></li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">{t("support.about.howTitle")}</h2>
            <p>{t("support.about.how")}</p>

            <p className="mt-8">{t("support.about.closing")}</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;

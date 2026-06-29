import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTranslation } from "react-i18next";

export type LegalSubsection = {
  title?: string;
  paragraphs?: string[];
  list?: string[];
};

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  list?: string[];
  subsections?: LegalSubsection[];
};

type LegalDocumentPageProps = {
  /** i18n key prefix, e.g. "legal.terms" */
  docKey: string;
};

const LegalDocumentPage = ({ docKey }: LegalDocumentPageProps) => {
  const { t } = useTranslation();
  const sections = t(`${docKey}.sections`, { returnObjects: true }) as LegalSection[];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-6">{t(`${docKey}.title`)}</h1>
          <p className="text-muted-foreground mb-8">{t(`${docKey}.lastUpdated`)}</p>

          <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
            {Array.isArray(sections) &&
              sections.map((section, idx) => (
                <section key={`${section.title}-${idx}`}>
                  <h2 className="text-2xl font-semibold text-foreground mb-4">{section.title}</h2>
                  {section.paragraphs?.map((p) => (
                    <p key={p.slice(0, 40)} className="mb-3">
                      {p}
                    </p>
                  ))}
                  {section.list && (
                    <ul className="list-disc list-inside space-y-2">
                      {section.list.map((item) => (
                        <li key={item.slice(0, 40)}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {section.subsections?.map((sub) => (
                    <div key={sub.title ?? sub.paragraphs?.[0]?.slice(0, 20)} className="mt-4">
                      {sub.title && (
                        <h3 className="text-xl font-semibold text-foreground mb-3">{sub.title}</h3>
                      )}
                      {sub.paragraphs?.map((p) => (
                        <p key={p.slice(0, 40)} className="mb-3">
                          {p}
                        </p>
                      ))}
                      {sub.list && (
                        <ul className="list-disc list-inside space-y-2">
                          {sub.list.map((item) => (
                            <li key={item.slice(0, 40)}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </section>
              ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalDocumentPage;

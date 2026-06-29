import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Car, DollarSign, Shield, Users, AlertTriangle, CheckCircle, TrendingUp, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

type GuideStep = { title: string; desc: string };

const OwnerGuide = () => {
  const { t } = useTranslation();

  const steps = t("owner.guide.steps", { returnObjects: true }) as GuideStep[];
  const increaseTips = t("owner.guide.increaseTips", { returnObjects: true }) as string[];
  const insuranceItems = t("owner.guide.insuranceItems", { returnObjects: true }) as string[];
  const securityItems = t("owner.guide.securityItems", { returnObjects: true }) as string[];
  const goodRenterItems = t("owner.guide.goodRenterItems", { returnObjects: true }) as string[];
  const cautionRenterItems = t("owner.guide.cautionRenterItems", { returnObjects: true }) as string[];
  const reservationAcceptItems = t("owner.guide.reservationAcceptItems", { returnObjects: true }) as string[];
  const availabilityItems = t("owner.guide.availabilityItems", { returnObjects: true }) as string[];
  const damageSteps = t("owner.guide.damageSteps", { returnObjects: true }) as string[];
  const lateReturnItems = t("owner.guide.lateReturnItems", { returnObjects: true }) as string[];
  const communicationItems = t("owner.guide.communicationItems", { returnObjects: true }) as string[];
  const maintenanceItems = t("owner.guide.maintenanceItems", { returnObjects: true }) as string[];
  const communicationBestItems = t("owner.guide.communicationBestItems", { returnObjects: true }) as string[];
  const pricingItems = t("owner.guide.pricingItems", { returnObjects: true }) as string[];
  const documentationItems = t("owner.guide.documentationItems", { returnObjects: true }) as string[];
  const paymentItems = t("owner.guide.paymentItems", { returnObjects: true }) as string[];
  const taxItems = t("owner.guide.taxItems", { returnObjects: true }) as string[];
  const successItems = t("owner.guide.successItems", { returnObjects: true }) as string[];

  const earningsExamples = [
    { label: t("owner.guide.earningsCompact"), amount: "12,000" },
    { label: t("owner.guide.earningsSedan"), amount: "16,800" },
    { label: t("owner.guide.earningsSuv"), amount: "24,000" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <Car className="w-10 h-10 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">{t("owner.guide.title")}</h1>
        </div>

        <div className="prose prose-lg max-w-none space-y-8 text-muted-foreground">
          <section className="bg-primary/10 p-6 rounded-lg border border-primary/20">
            <h2 className="text-2xl font-semibold text-foreground mb-4">{t("owner.guide.introTitle")}</h2>
            <p>{t("owner.guide.intro")}</p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">{t("owner.guide.gettingStarted")}</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {steps.map((step, index) => (
                <Card key={step.title} className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                      <p>{step.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">{t("owner.guide.earningsTitle")}</h2>
            </div>

            <div className="bg-card p-6 rounded-lg border mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">{t("owner.guide.earningsExample")}</h3>
              <div className="space-y-4">
                {earningsExamples.map((example) => (
                  <div key={example.label} className="flex justify-between items-center border-b pb-2">
                    <span>{example.label}</span>
                    <span className="font-semibold text-foreground">
                      {t("owner.guide.earningsPerMonth", { amount: example.amount })}
                    </span>
                  </div>
                ))}
                <p className="text-sm mt-4 text-muted-foreground">{t("owner.guide.earningsNote")}</p>
              </div>
            </div>

            <div className="bg-primary/10 p-6 rounded-lg border border-primary/20">
              <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {t("owner.guide.increaseEarnings")}
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-6">
                {increaseTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">{t("owner.guide.securityTitle")}</h2>
            </div>

            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  {t("owner.guide.insuranceCoverage")}
                </h3>
                <ul className="list-disc list-inside space-y-2 ml-6">
                  {insuranceItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  {t("owner.guide.securityMeasures")}
                </h3>
                <ul className="list-disc list-inside space-y-2 ml-6">
                  {securityItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">{t("owner.guide.renterSelection")}</h2>
            </div>

            <Card className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">{t("owner.guide.renterCriteria")}</h3>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2">{t("owner.guide.goodRenter")}</h4>
                  <ul className="list-disc list-inside space-y-1 ml-6">
                    {goodRenterItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900">
                  <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">{t("owner.guide.cautionRenter")}</h4>
                  <ul className="list-disc list-inside space-y-1 ml-6 text-muted-foreground">
                    {cautionRenterItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">{t("owner.guide.rentalManagement")}</h2>
            </div>

            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-3">{t("owner.guide.reservationAccept")}</h3>
                <p className="mb-4">{t("owner.guide.reservationAcceptDesc")}</p>
                <ul className="list-disc list-inside space-y-2 ml-6">
                  {reservationAcceptItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-3">{t("owner.guide.availabilityCalendar")}</h3>
                <p className="mb-4">{t("owner.guide.availabilityDesc")}</p>
                <ul className="list-disc list-inside space-y-2 ml-6">
                  {availabilityItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">{t("owner.guide.troubleshooting")}</h2>
            </div>

            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-3">{t("owner.guide.damageTitle")}</h3>
                <ol className="list-decimal list-inside space-y-2 ml-6">
                  {damageSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-3">{t("owner.guide.lateReturnTitle")}</h3>
                <p className="mb-2">{t("owner.guide.lateReturnIntro")}</p>
                <ul className="list-disc list-inside space-y-2 ml-6">
                  {lateReturnItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-3">{t("owner.guide.communicationTitle")}</h3>
                <p className="mb-2">{t("owner.guide.communicationIntro")}</p>
                <ul className="list-disc list-inside space-y-2 ml-6">
                  {communicationItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">{t("owner.guide.bestPractices")}</h2>
            </div>

            <Card className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">{t("owner.guide.maintenance")}</h3>
                  <ul className="list-disc list-inside space-y-2 ml-6">
                    {maintenanceItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">{t("owner.guide.communication")}</h3>
                  <ul className="list-disc list-inside space-y-2 ml-6">
                    {communicationBestItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">{t("owner.guide.pricing")}</h3>
                  <ul className="list-disc list-inside space-y-2 ml-6">
                    {pricingItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">{t("owner.guide.documentation")}</h3>
                  <ul className="list-disc list-inside space-y-2 ml-6">
                    {documentationItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground">{t("owner.guide.paymentTitle")}</h2>
            </div>

            <Card className="p-6">
              <h3 className="text-xl font-semibold text-foreground mb-3">{t("owner.guide.paymentProcess")}</h3>
              <ul className="list-disc list-inside space-y-2 ml-6 mb-6">
                {paymentItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">{t("owner.guide.taxTitle")}</h4>
                <p className="mb-2">{t("owner.guide.taxIntro")}</p>
                <ul className="list-disc list-inside space-y-2 ml-6">
                  {taxItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </Card>
          </section>

          <section className="bg-primary/10 p-6 rounded-lg border border-primary/20">
            <h2 className="text-2xl font-semibold text-foreground mb-4">{t("owner.guide.supportTitle")}</h2>
            <p className="mb-4">{t("owner.guide.supportIntro")}</p>
            <div className="space-y-2">
              <p>
                <strong className="text-foreground">{t("owner.guide.supportPhone")}</strong> +90 (462) 123 45 67
              </p>
              <p>
                <strong className="text-foreground">{t("owner.guide.supportEmail")}</strong> owner-support@ride-yo.com
              </p>
              <p>
                <strong className="text-foreground">{t("owner.guide.supportWhatsapp")}</strong> +90 (539) 526 32 93
              </p>
              <p>
                <strong className="text-foreground">{t("owner.guide.supportHours")}</strong> {t("owner.guide.supportHoursValue")}
              </p>
            </div>
          </section>

          <section className="bg-card p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              {t("owner.guide.successTips")}
            </h2>
            <div className="space-y-3">
              {successItems.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OwnerGuide;

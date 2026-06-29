import { Smartphone, MapPin, Key, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const stepKeys = [
  { key: "createAccount", icon: Smartphone },
  { key: "chooseCar", icon: MapPin },
  { key: "startBooking", icon: Key },
  { key: "driveSafely", icon: CheckCircle },
] as const;

const HowItWorks = () => {
  const { t } = useTranslation();

  return (
    <section id="how-it-works" className="bg-background py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <div className="mb-4 inline-block rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
            <span className="text-sm font-semibold text-primary">{t("components.howItWorks.badge")}</span>
          </div>
          <h2 className="mb-4 text-4xl font-bold text-foreground sm:text-5xl">
            {t("components.howItWorks.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            {t("components.howItWorks.subtitle")}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {stepKeys.map(({ key, icon: Icon }, index) => (
            <div key={key} className="group relative">
              <div className="h-full rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                <div className="absolute -left-4 -top-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-lg font-bold text-white shadow-lg">
                  {index + 1}
                </div>
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mb-3 text-center text-xl font-bold text-foreground">
                  {t(`components.howItWorks.steps.${key}.title`)}
                </h3>
                <p className="text-center text-muted-foreground">
                  {t(`components.howItWorks.steps.${key}.description`)}
                </p>
              </div>
              {index < stepKeys.length - 1 && (
                <div className="absolute -right-4 top-1/2 hidden h-0.5 w-8 -translate-y-1/2 bg-gradient-to-r from-primary to-accent lg:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

import { Shield, Zap, CreditCard, Clock, Fuel, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";

const featureKeys = [
  { key: "fastBooking", icon: Zap },
  { key: "flexiblePricing", icon: CreditCard },
  { key: "fuelSupport", icon: Fuel },
  { key: "secureExperience", icon: Shield },
  { key: "access247", icon: Clock },
  { key: "mobileFirst", icon: Smartphone },
] as const;

const Features = () => {
  const { t } = useTranslation();

  return (
    <section className="bg-muted/30 py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <div className="mb-4 inline-block rounded-full border border-accent/20 bg-accent/10 px-4 py-2">
            <span className="text-sm font-semibold text-accent">{t("components.features.badge")}</span>
          </div>
          <h2 className="mb-4 text-4xl font-bold text-foreground sm:text-5xl">
            {t("components.features.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            {t("components.features.subtitle")}
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {featureKeys.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
                <Icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-foreground">
                {t(`components.features.items.${key}.title`)}
              </h3>
              <p className="text-muted-foreground">
                {t(`components.features.items.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

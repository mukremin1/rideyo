import { Shield, Users, Clock, Award } from "lucide-react";
import { useTranslation } from "react-i18next";

const AboutSection = () => {
  const { t } = useTranslation();

  const stats = [
    { icon: Users, value: "50.000+", labelKey: "users" },
    { icon: Shield, value: "%100", labelKey: "secure" },
    { icon: Clock, value: "7/24", labelKey: "support" },
    { icon: Award, value: "5 Yıl", labelKey: "experience" },
  ];

  const advantages = t("components.about.advantages", { returnObjects: true }) as string[];

  return (
    <section className="bg-muted/30 py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">{t("components.about.title")}</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            {t("components.about.description")}
          </p>
        </div>

        <div className="mb-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.labelKey}
              className="rounded-xl border border-border bg-card p-6 text-center shadow-sm"
            >
              <stat.icon className="mx-auto mb-3 h-10 w-10 text-primary" />
              <div className="mb-1 text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground">
                {t(`components.about.stats.${stat.labelKey}`)}
              </div>
            </div>
          ))}
        </div>

        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-4 text-2xl font-semibold text-foreground">
              {t("components.about.advantagesTitle")}
            </h3>
            <ul className="space-y-3">
              {advantages.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-sm text-primary">✓</span>
                  </div>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 p-8 text-center">
            <blockquote className="mb-4 text-lg italic text-foreground">
              &ldquo;{t("components.about.quote")}&rdquo;
            </blockquote>
            <p className="text-sm text-muted-foreground">{t("components.about.quoteAuthor")}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;

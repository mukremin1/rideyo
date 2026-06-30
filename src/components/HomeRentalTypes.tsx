import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clock, Timer, CalendarDays, Crown, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const rentalOptions = [
  {
    key: "minute",
    icon: Timer,
    href: "/cars?rental=minute",
    tone: "bg-orange-500/10 text-orange-600 ring-orange-500/20",
  },
  {
    key: "hour",
    icon: Clock,
    href: "/cars?rental=hour",
    tone: "bg-primary/10 text-primary ring-primary/20",
  },
  {
    key: "day",
    icon: CalendarDays,
    href: "/cars?rental=day",
    tone: "bg-accent/10 text-accent ring-accent/25",
  },
  {
    key: "month",
    icon: Crown,
    href: "/packages",
    tone: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
  },
] as const;

const HomeRentalTypes = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="px-4 pb-6 pt-7 sm:px-6 sm:pb-8 sm:pt-9">
      <div className="container mx-auto">
        <div className="mb-6 max-w-xl">
          <p className="section-eyebrow">{t("home.rentalTypesEyebrow")}</p>
          <h1 className="section-title mt-2">{t("home.rentalTypesTitle")}</h1>
          <p className="section-subtitle">{t("home.rentalTypesSubtitle")}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {rentalOptions.map(({ key, icon: Icon, href, tone }) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(href)}
              className={cn(
                "group surface-card relative overflow-hidden p-4 text-left sm:p-5",
                "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)] active:scale-[0.99]",
              )}
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset transition-transform group-hover:scale-105",
                    tone,
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
              </div>
              <p className="text-[0.9375rem] font-semibold tracking-tight text-foreground">
                {t(`home.rentalTypes.${key}.title`)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t(`home.rentalTypes.${key}.desc`)}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeRentalTypes;

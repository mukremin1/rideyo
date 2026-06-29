import { Car, Calendar, CreditCard, CheckCircle, MapPin, Shield, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";

const stepKeys = [
  { key: "carSelection", icon: Car },
  { key: "duration", icon: Calendar },
  { key: "pickup", icon: MapPin },
  { key: "insurance", icon: Shield },
  { key: "payment", icon: CreditCard },
  { key: "confirmation", icon: CheckCircle },
] as const;

const ReservationSteps = () => {
  const { t } = useTranslation();

  return (
    <section className="bg-background py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            {t("components.reservationSteps.title")}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {t("components.reservationSteps.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stepKeys.map(({ key, icon: Icon }, index) => (
            <div
              key={key}
              className="group relative rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg"
            >
              <div className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </div>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">
                {t(`components.reservationSteps.steps.${key}.title`)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(`components.reservationSteps.steps.${key}.description`)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/cars">
              <Car className="mr-2 h-5 w-5" />
              {t("components.reservationSteps.viewFleet")}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/identity-verification">
              <UserPlus className="mr-2 h-5 w-5" />
              {t("components.reservationSteps.identityVerification")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ReservationSteps;

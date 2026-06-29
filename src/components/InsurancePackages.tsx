import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Shield, CheckCircle } from "lucide-react";

const PACKAGE_IDS = ["basic", "standard", "premium"] as const;
const PACKAGE_PRICES: Record<(typeof PACKAGE_IDS)[number], number> = {
  basic: 550,
  standard: 750,
  premium: 950,
};
const RECOMMENDED_PACKAGE = "standard";

interface InsurancePackagesProps {
  onSelect: (packageId: string, price: number) => void;
  selectedPackage?: string;
  rentalType?: string;
}

const InsurancePackages = ({ onSelect, selectedPackage, rentalType }: InsurancePackagesProps) => {
  const { t } = useTranslation();

  if (rentalType !== "day") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-primary" />
        <h3 className="text-2xl font-bold">{t("insurance.title")}</h3>
        <span className="text-sm text-muted-foreground">{t("insurance.requiredForDaily")}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PACKAGE_IDS.map((pkgId) => {
          const price = PACKAGE_PRICES[pkgId];
          const features = t(`insurance.packages.${pkgId}.features`, { returnObjects: true }) as string[];
          const isRecommended = pkgId === RECOMMENDED_PACKAGE;

          return (
            <Card
              key={pkgId}
              className={`relative ${
                selectedPackage === pkgId
                  ? "border-primary shadow-lg"
                  : "border-border"
              } ${isRecommended ? "border-accent" : ""}`}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-medium">
                  {t("insurance.recommended")}
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{t(`insurance.packages.${pkgId}.name`)}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">
                    ₺{price}
                  </span>
                  <span className="text-muted-foreground">{t("insurance.perDay")}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={selectedPackage === pkgId ? "default" : "outline"}
                  onClick={() => onSelect(pkgId, price)}
                >
                  {selectedPackage === pkgId ? t("insurance.selected") : t("insurance.select")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default InsurancePackages;

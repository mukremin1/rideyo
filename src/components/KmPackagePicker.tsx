import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import {
  getKmPackageOptions,
  KM_PRICE_PER_UNIT,
  type KmPackageId,
} from "@/lib/rentalPricing";

type KmPackagePickerProps = {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

const KmPackagePicker = ({ selectedId, onSelect }: KmPackagePickerProps) => {
  const { t } = useTranslation();
  const packages = getKmPackageOptions();

  const toggle = (id: string) => {
    onSelect(selectedId === id ? null : id);
  };

  return (
    <div>
      <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
        <Badge variant="secondary">{t("carDetail.kmBadge")}</Badge>
        {t("carDetail.kmPackages")}
        <span className="text-xs font-normal text-muted-foreground">({t("common.optional")})</span>
      </h4>
      <p className="text-xs text-muted-foreground mb-3">
        {t("carDetail.kmOptionalHint", { price: KM_PRICE_PER_UNIT })}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {packages.map((pkg) => (
          <button
            type="button"
            key={pkg.id}
            className={`border rounded-xl p-4 text-left transition-all ${
              selectedId === pkg.id
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => toggle(pkg.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-lg font-bold text-foreground">
                {t(`carDetail.kmPackage${pkg.id}` as `carDetail.kmPackage${KmPackageId}`)}
              </div>
              <Badge variant="outline" className="shrink-0 text-xs text-green-700 border-green-600/40">
                {t("carDetail.kmDiscountBadge", { discount: pkg.discountPercent })}
              </Badge>
            </div>
            <div className="text-lg font-semibold text-primary mt-1">{pkg.price.toFixed(2)}₺</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("carDetail.kmEffectiveRate", { rate: pkg.effectiveRatePerKm.toFixed(2) })}
            </p>
            {selectedId === pkg.id && (
              <div className="mt-2 text-xs font-semibold text-primary">{t("carDetail.selected")}</div>
            )}
          </button>
        ))}
        <button
          type="button"
          className={`border rounded-xl p-4 text-left transition-all ${
            selectedId === "none"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => toggle("none")}
        >
          <div className="text-lg font-bold text-foreground">{t("carDetail.kmPackageNoneTitle")}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {t("carDetail.kmPackageNone", { price: KM_PRICE_PER_UNIT })}
          </div>
          {selectedId === "none" && (
            <div className="mt-2 text-xs font-semibold text-primary">{t("carDetail.selected")}</div>
          )}
        </button>
      </div>
    </div>
  );
};

export default KmPackagePicker;

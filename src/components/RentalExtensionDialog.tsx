import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  computeExtensionPrice,
  formatExtensionLabel,
  getExtensionOptions,
  type CarExtensionPricing,
  type ExtensionUnits,
} from "@/lib/rentalExtension";

type RentalExtensionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentalType: "minute" | "hour" | "day";
  carPricing: CarExtensionPricing;
  loading?: boolean;
  onConfirm: (units: ExtensionUnits) => Promise<void>;
};

const RentalExtensionDialog = ({
  open,
  onOpenChange,
  rentalType,
  carPricing,
  loading = false,
  onConfirm,
}: RentalExtensionDialogProps) => {
  const { t } = useTranslation();
  const options = useMemo(() => getExtensionOptions(rentalType), [rentalType]);
  const [selected, setSelected] = useState<ExtensionUnits | null>(options[0] ?? null);

  const selectedPrice = selected ? computeExtensionPrice(rentalType, carPricing, selected) : 0;
  const selectedLabel = selected ? formatExtensionLabel(rentalType, selected, t) : "";

  const handleConfirm = async () => {
    if (!selected) return;
    await onConfirm(selected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {t("rental.extendTitle")}
          </DialogTitle>
          <DialogDescription>{t("rental.extendDesc")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {options.map((option) => {
            const label = formatExtensionLabel(rentalType, option, t);
            const price = computeExtensionPrice(rentalType, carPricing, option);
            const isSelected =
              JSON.stringify(option) === JSON.stringify(selected);

            return (
              <button
                key={label}
                type="button"
                disabled={loading}
                onClick={() => setSelected(option)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-xs text-primary mt-1">{price.toFixed(2)} ₺</div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
            <p className="text-muted-foreground">{t("rental.extendSummary")}</p>
            <p className="font-semibold mt-1">
              {selectedLabel} — {selectedPrice.toFixed(2)} ₺
            </p>
            <p className="text-xs text-muted-foreground mt-2">{t("rental.extendCardNote")}</p>
          </div>
        )}

        <Button className="w-full" disabled={!selected || loading} onClick={handleConfirm}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              {t("rental.extendProcessing")}
            </>
          ) : (
            t("rental.extendConfirm")
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default RentalExtensionDialog;

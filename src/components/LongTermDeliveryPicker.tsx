import { useTranslation } from "react-i18next";
import { CalendarClock, Zap } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { LongTermDeliveryMode } from "@/lib/longTermDelivery";
import { getDefaultScheduledDate } from "@/lib/longTermDelivery";

type LongTermDeliveryPickerProps = {
  mode: LongTermDeliveryMode;
  onModeChange: (mode: LongTermDeliveryMode) => void;
  scheduledDate: string;
  scheduledTime: string;
  onScheduledDateChange: (value: string) => void;
  onScheduledTimeChange: (value: string) => void;
};

const LongTermDeliveryPicker = ({
  mode,
  onModeChange,
  scheduledDate,
  scheduledTime,
  onScheduledDateChange,
  onScheduledTimeChange,
}: LongTermDeliveryPickerProps) => {
  const { t } = useTranslation();
  const minDate = getDefaultScheduledDate();

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
      <div>
        <h4 className="font-semibold text-foreground">{t("carDetail.deliveryTitle")}</h4>
        <p className="text-xs text-muted-foreground mt-1">{t("carDetail.deliveryDesc")}</p>
      </div>

      <RadioGroup
        value={mode}
        onValueChange={(value) => onModeChange(value as LongTermDeliveryMode)}
        className="grid sm:grid-cols-2 gap-3"
      >
        <label
          htmlFor="delivery-immediate"
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
            mode === "immediate" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
          }`}
        >
          <RadioGroupItem value="immediate" id="delivery-immediate" className="mt-1" />
          <div>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Zap className="w-4 h-4 text-primary" />
              {t("carDetail.deliveryImmediate")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("carDetail.deliveryImmediateDesc")}</p>
          </div>
        </label>

        <label
          htmlFor="delivery-scheduled"
          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
            mode === "scheduled" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
          }`}
        >
          <RadioGroupItem value="scheduled" id="delivery-scheduled" className="mt-1" />
          <div>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <CalendarClock className="w-4 h-4 text-primary" />
              {t("carDetail.deliveryScheduled")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("carDetail.deliveryScheduledDesc")}</p>
          </div>
        </label>
      </RadioGroup>

      {mode === "scheduled" && (
        <div className="grid sm:grid-cols-2 gap-4 pt-1">
          <div>
            <Label htmlFor="scheduled-pickup-date" className="text-sm mb-2 block">
              {t("carDetail.deliveryDate")}
            </Label>
            <Input
              id="scheduled-pickup-date"
              type="date"
              min={minDate}
              value={scheduledDate}
              onChange={(e) => onScheduledDateChange(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="scheduled-pickup-time" className="text-sm mb-2 block">
              {t("carDetail.deliveryTime")}
            </Label>
            <Input
              id="scheduled-pickup-time"
              type="time"
              value={scheduledTime}
              onChange={(e) => onScheduledTimeChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LongTermDeliveryPicker;

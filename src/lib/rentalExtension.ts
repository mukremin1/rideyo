import {
  DAYS_PER_MONTH,
  DEFAULT_RENTAL_MINUTES,
  HOUR_RENTAL_OPTIONS,
  MINUTE_RENTAL_OPTIONS,
  computeHourlyRentalBase,
} from "@/lib/rentalPricing";

export const EXTENSION_MINUTE_OPTIONS = MINUTE_RENTAL_OPTIONS;
export const EXTENSION_HOUR_OPTIONS = HOUR_RENTAL_OPTIONS;
export const EXTENSION_DAY_OPTIONS = [1, 2, 3, 5, 7, 14, 30] as const;

export type CarExtensionPricing = {
  pricePerMinute: number;
  pricePerHour: number;
  pricePerDay: number;
};

export type ExtensionUnits = {
  extensionMinutes?: number;
  extensionHours?: number;
  extensionDays?: number;
};

export function computeExtensionPrice(
  rentalType: "minute" | "hour" | "day",
  car: CarExtensionPricing,
  units: ExtensionUnits,
): number {
  if (rentalType === "minute" && units.extensionMinutes) {
    const minutes = Math.max(DEFAULT_RENTAL_MINUTES, units.extensionMinutes);
    return Math.round(minutes * car.pricePerMinute * 100) / 100;
  }
  if (rentalType === "hour" && units.extensionHours != null) {
    return computeHourlyRentalBase(car.pricePerHour, units.extensionHours);
  }
  if (rentalType === "day" && units.extensionDays) {
    return Math.round(units.extensionDays * car.pricePerDay * 100) / 100;
  }
  return 0;
}

export function formatExtensionLabel(
  rentalType: "minute" | "hour" | "day",
  units: ExtensionUnits,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (rentalType === "minute" && units.extensionMinutes) {
    return t(`rental.extendMinutes${units.extensionMinutes}` as "rental.extendMinutes15");
  }
  if (rentalType === "hour" && units.extensionHours != null) {
    if (units.extensionHours === 0.5) return t("rental.extendHalfHour");
    return t("rental.extendHours", { count: units.extensionHours });
  }
  if (rentalType === "day" && units.extensionDays) {
    if (units.extensionDays % 30 === 0 && units.extensionDays >= 30) {
      return t("rental.extendMonths", { count: units.extensionDays / DAYS_PER_MONTH });
    }
    return t("rental.extendDays", { count: units.extensionDays });
  }
  return "";
}

export function getExtensionOptions(rentalType: "minute" | "hour" | "day"): ExtensionUnits[] {
  if (rentalType === "minute") {
    return EXTENSION_MINUTE_OPTIONS.map((m) => ({ extensionMinutes: m }));
  }
  if (rentalType === "hour") {
    return EXTENSION_HOUR_OPTIONS.map((h) => ({ extensionHours: h }));
  }
  return EXTENSION_DAY_OPTIONS.map((d) => ({ extensionDays: d }));
}

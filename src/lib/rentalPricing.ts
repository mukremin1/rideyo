export const MINUTE_PROVISION_FEE = 300;
export const DAY_PROVISION_FEE = 350;
export const DIFFERENT_ZONE_FEE = 150;
export const ADDITIONAL_DRIVER_DAILY_FEE = 50;
export const MINUTE_RENTAL_OPTIONS = [15, 30, 45] as const;
export const DEFAULT_RENTAL_MINUTES = 15;
/** Hourly rental packages from 30 minutes up to 12 hours */
export const HOUR_RENTAL_OPTIONS = [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const DEFAULT_RENTAL_HOURS = 0.5;
export type HourRentalOption = (typeof HOUR_RENTAL_OPTIONS)[number];
/** Fixed price per 30-minute block; longer packages scale from this base */
export const HALF_HOUR_MIN_PRICE = 210;
export const DAYS_PER_MONTH = 30;
/** Extra charge per minute after prepaid package expires */
export const OVERTIME_RATE_PER_MINUTE = 7.5;
/** Per-km charge when no km package or package limit exceeded */
export const KM_PRICE_PER_UNIT = 26.5;

/** Volume discount by package size (percent off list km rate) */
export const KM_PACKAGE_DISCOUNTS: Record<string, number> = {
  "50": 5,
  "100": 10,
  "200": 15,
  "500": 20,
  "1000": 25,
};

export const KM_PACKAGE_IDS = ["50", "100", "200", "500", "1000"] as const;
export type KmPackageId = (typeof KM_PACKAGE_IDS)[number];

export const KM_PACKAGE_INCLUDED_KM: Record<string, number> = {
  "50": 50,
  "100": 100,
  "200": 200,
  "500": 500,
  "1000": 1000,
};

export function getKmPackageDiscount(kmPackageId: string | null | undefined): number {
  if (!kmPackageId || kmPackageId === "none") return 0;
  return KM_PACKAGE_DISCOUNTS[kmPackageId] ?? 0;
}

export function computeKmPackagePrice(
  kmPackageId: string | null | undefined,
  baseRate = KM_PRICE_PER_UNIT,
): number {
  const includedKm = resolveIncludedKm(kmPackageId);
  if (includedKm <= 0) return 0;
  const discount = getKmPackageDiscount(kmPackageId);
  return Math.round(includedKm * baseRate * (1 - discount / 100) * 100) / 100;
}

export function computeKmPackageEffectiveRate(
  kmPackageId: string | null | undefined,
  baseRate = KM_PRICE_PER_UNIT,
): number {
  const includedKm = resolveIncludedKm(kmPackageId);
  if (includedKm <= 0) return baseRate;
  const price = computeKmPackagePrice(kmPackageId, baseRate);
  return Math.round((price / includedKm) * 100) / 100;
}

export type KmPackageOption = {
  id: KmPackageId;
  includedKm: number;
  discountPercent: number;
  price: number;
  effectiveRatePerKm: number;
};

export function getKmPackageOptions(baseRate = KM_PRICE_PER_UNIT): KmPackageOption[] {
  return KM_PACKAGE_IDS.map((id) => {
    const includedKm = KM_PACKAGE_INCLUDED_KM[id];
    const discountPercent = KM_PACKAGE_DISCOUNTS[id];
    const price = computeKmPackagePrice(id, baseRate);
    return {
      id,
      includedKm,
      discountPercent,
      price,
      effectiveRatePerKm: Math.round((price / includedKm) * 100) / 100,
    };
  });
}

export function resolveIncludedKm(kmPackageId: string | null | undefined): number {
  if (!kmPackageId || kmPackageId === "none") return 0;
  return KM_PACKAGE_INCLUDED_KM[kmPackageId] ?? 0;
}

export function computeChargeableKm(totalDistanceKm: number, includedKm: number): number {
  const chargeable = Math.max(0, totalDistanceKm - includedKm);
  return Math.round(chargeable * 100) / 100;
}

export function computeKmChargeAmount(chargeableKm: number, rate = KM_PRICE_PER_UNIT): number {
  return Math.round(chargeableKm * rate * 100) / 100;
}

export function computeOvertimeMinutes(prepaidEndTime: Date, now = new Date()): number {
  const diffMs = now.getTime() - prepaidEndTime.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / 60_000);
}

export function computeOvertimeAmount(overtimeMinutes: number, rate = OVERTIME_RATE_PER_MINUTE): number {
  return Math.round(overtimeMinutes * rate * 100) / 100;
}

export function computeHourlyRentalBase(_pricePerHour: number, hours: number): number {
  const safeHours = HOUR_RENTAL_OPTIONS.includes(hours as HourRentalOption)
    ? hours
    : DEFAULT_RENTAL_HOURS;
  const halfHourUnits = safeHours / 0.5;
  return Math.round(HALF_HOUR_MIN_PRICE * halfHourUnits * 100) / 100;
}

export type RentalPricingInput = {
  rentalType: "minute" | "hour" | "day" | "month";
  pricePerMinute: number;
  pricePerHour: number;
  pricePerDay: number;
  rentalMinutes: number;
  rentalHours: number;
  rentalDays: number;
  rentalMonths: number;
  insurancePrice: number;
  kmPackagePrice: number;
  pickupZoneId?: string;
  dropoffZoneId?: string;
  subscriptionDiscountPercent?: number;
  campaignDiscountPercent?: number;
  additionalDriverEnabled?: boolean;
  additionalDriverDays?: number;
};

export type RentalPricingBreakdown = {
  rentalBase: number;
  provisionFee: number;
  insurancePrice: number;
  kmPackagePrice: number;
  zoneFee: number;
  additionalDriverFee: number;
  subtotal: number;
  subscriptionDiscount: number;
  campaignDiscount: number;
  totalPrice: number;
};

export function computeRentalPricing(input: RentalPricingInput): RentalPricingBreakdown {
  let rentalBase = 0;
  let provisionFee = 0;

  if (input.rentalType === "minute") {
    const minutes = Math.max(15, input.rentalMinutes || DEFAULT_RENTAL_MINUTES);
    rentalBase = input.pricePerMinute * minutes;
    provisionFee = MINUTE_PROVISION_FEE;
  } else if (input.rentalType === "hour") {
    const hours = HOUR_RENTAL_OPTIONS.includes(input.rentalHours as HourRentalOption)
      ? input.rentalHours
      : DEFAULT_RENTAL_HOURS;
    rentalBase = computeHourlyRentalBase(input.pricePerHour, hours);
    provisionFee = MINUTE_PROVISION_FEE;
  } else if (input.rentalType === "month") {
    const months = Math.max(1, input.rentalMonths || 1);
    rentalBase = input.pricePerDay * DAYS_PER_MONTH * months;
    provisionFee = DAY_PROVISION_FEE;
  } else {
    rentalBase = input.pricePerDay * input.rentalDays;
    provisionFee = DAY_PROVISION_FEE;
  }

  const insurancePrice = input.rentalType === "day" || input.rentalType === "month" ? input.insurancePrice : 0;
  const zoneFee =
    (input.rentalType === "day" || input.rentalType === "month") &&
    input.pickupZoneId &&
    input.dropoffZoneId &&
    input.pickupZoneId !== input.dropoffZoneId
      ? DIFFERENT_ZONE_FEE
      : 0;

  const additionalDriverFee =
    (input.rentalType === "day" || input.rentalType === "month") && input.additionalDriverEnabled
      ? ADDITIONAL_DRIVER_DAILY_FEE * (input.additionalDriverDays ?? 1)
      : 0;

  const subtotal =
    rentalBase + provisionFee + insurancePrice + input.kmPackagePrice + zoneFee + additionalDriverFee;

  const subscriptionDiscount = input.subscriptionDiscountPercent
    ? (subtotal * input.subscriptionDiscountPercent) / 100
    : 0;
  const afterSubscription = subtotal - subscriptionDiscount;

  const campaignDiscount = input.campaignDiscountPercent
    ? (afterSubscription * input.campaignDiscountPercent) / 100
    : 0;

  const totalPrice = afterSubscription - campaignDiscount;

  return {
    rentalBase,
    provisionFee,
    insurancePrice,
    kmPackagePrice: input.kmPackagePrice,
    zoneFee,
    additionalDriverFee,
    subtotal,
    subscriptionDiscount,
    campaignDiscount,
    totalPrice: Math.max(0, totalPrice),
  };
}

export const MINUTE_PROVISION_FEE = 300;
export const DAY_PROVISION_FEE = 350;
export const DIFFERENT_ZONE_FEE = 150;
export const ADDITIONAL_DRIVER_DAILY_FEE = 50;

export type RentalPricingInput = {
  rentalType: "minute" | "hour" | "day";
  pricePerMinute: number;
  pricePerHour: number;
  pricePerDay: number;
  rentalHours: number;
  rentalDays: number;
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
    rentalBase = input.pricePerMinute * 30;
    provisionFee = MINUTE_PROVISION_FEE;
  } else if (input.rentalType === "hour") {
    rentalBase = input.pricePerHour * input.rentalHours;
    provisionFee = MINUTE_PROVISION_FEE;
  } else {
    rentalBase = input.pricePerDay * input.rentalDays;
    provisionFee = DAY_PROVISION_FEE;
  }

  const insurancePrice = input.rentalType === "day" ? input.insurancePrice : 0;
  const zoneFee =
    input.rentalType === "day" &&
    input.pickupZoneId &&
    input.dropoffZoneId &&
    input.pickupZoneId !== input.dropoffZoneId
      ? DIFFERENT_ZONE_FEE
      : 0;

  const additionalDriverFee =
    input.rentalType === "day" && input.additionalDriverEnabled
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

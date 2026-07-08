export const HALF_HOUR_MIN_PRICE = 210;

export function computeHourlyRentalBase(_pricePerHour: number, hours: number): number {
  const halfHourUnits = hours / 0.5;
  return Math.round(HALF_HOUR_MIN_PRICE * halfHourUnits * 100) / 100;
}

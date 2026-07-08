export const GPS_SIGNAL_MAX_AGE_MS = 5 * 60 * 1000;

export function carHasGpsDevice(car: { gps_device_id?: string | null }): boolean {
  return Boolean(car.gps_device_id?.trim());
}

export function carHasRecentGpsSignal(car: { last_gps_update?: string | null }, now = Date.now()): boolean {
  if (!car.last_gps_update) return false;
  const updatedAt = new Date(car.last_gps_update).getTime();
  return Number.isFinite(updatedAt) && now - updatedAt <= GPS_SIGNAL_MAX_AGE_MS;
}

export function carIsGpsReadyForRental(car: {
  gps_device_id?: string | null;
  last_gps_update?: string | null;
}, now = Date.now()): boolean {
  return carHasGpsDevice(car) || carHasRecentGpsSignal(car, now);
}

/** Max age for a live GPS signal before rental start is blocked */
export const GPS_SIGNAL_MAX_AGE_MS = 5 * 60 * 1000;

export type CarGpsFields = {
  gps_device_id?: string | null;
  last_gps_update?: string | null;
};

export function carHasGpsDevice(car: CarGpsFields): boolean {
  return Boolean(car.gps_device_id?.trim());
}

export function carHasRecentGpsSignal(car: CarGpsFields, now = Date.now()): boolean {
  if (!car.last_gps_update) return false;
  const updatedAt = new Date(car.last_gps_update).getTime();
  return Number.isFinite(updatedAt) && now - updatedAt <= GPS_SIGNAL_MAX_AGE_MS;
}

/** Rental start: linked GPS device or live signal within the last 5 minutes */
export function carIsGpsReadyForRental(car: CarGpsFields, now = Date.now()): boolean {
  return carHasGpsDevice(car) || carHasRecentGpsSignal(car, now);
}

/** Public listings: only cars with a registered GPS device */
export function carIsVisibleInListings(car: CarGpsFields): boolean {
  return carHasGpsDevice(car);
}

export function getGpsSignalAgeMinutes(car: CarGpsFields, now = Date.now()): number | null {
  if (!car.last_gps_update) return null;
  const updatedAt = new Date(car.last_gps_update).getTime();
  if (!Number.isFinite(updatedAt)) return null;
  return Math.max(0, Math.floor((now - updatedAt) / 60_000));
}

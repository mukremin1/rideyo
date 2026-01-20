export type LatLngTuple = [number, number];

const trNormalize = (value: string) =>
  value
    .toLowerCase()
    // Remove Turkish-specific letters
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    // Remove combining marks produced by toLowerCase() (e.g. İ -> i̇)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// Small curated list for common districts; keys MUST be normalized (ascii)
const ISTANBUL_DISTRICTS: Record<string, LatLngTuple> = {
  sancaktepe: [41.0028, 29.2341],
  pendik: [40.8756, 29.2339],
  kartal: [40.8899, 29.1856],
  maltepe: [40.9345, 29.1306],
  kadikoy: [40.9927, 29.0259],
  uskudar: [41.0234, 29.0153],
  beykoz: [41.1323, 29.1017],
  umraniye: [41.0162, 29.1244],
  atasehir: [40.9833, 29.1167],
  sultanbeyli: [40.9614, 29.2617],
  tuzla: [40.8167, 29.3],
  cekmekoy: [41.0333, 29.1833],
  sile: [41.1761, 29.6128],
  beylikduzu: [40.9833, 28.6333],
  esenyurt: [41.0333, 28.6833],
  avcilar: [40.9833, 28.7167],
  bakirkoy: [40.9833, 28.8667],
  bahcelievler: [41.0, 28.85],
  bagcilar: [41.0333, 28.85],
  kucukcekmece: [41.0, 28.7667],
  buyukcekmece: [41.0167, 28.5833],
  basaksehir: [41.0833, 28.8],
  arnavutkoy: [41.2, 28.75],
  eyupsultan: [41.0833, 28.9333],
  gaziosmanpasa: [41.0667, 28.9167],
  sultangazi: [41.1, 28.85],
  kagithane: [41.0833, 28.9667],
  sisli: [41.0667, 28.9833],
  beyoglu: [41.0333, 28.9833],
  fatih: [41.0167, 28.95],
  zeytinburnu: [41.0, 28.9],
  gungoren: [41.0167, 28.8833],
  esenler: [41.05, 28.8833],
  bayrampasa: [41.05, 28.9167],
  besiktas: [41.05, 29.0],
  sariyer: [41.1667, 29.05],
  catalca: [41.1417, 28.4611],
  silivri: [41.0736, 28.2467],
  adalar: [40.8761, 29.0911],
};

const CITY_CENTERS: Record<string, LatLngTuple> = {
  istanbul: [41.0082, 28.9784],
  ankara: [39.9334, 32.8597],
  izmir: [38.4237, 27.1428],
  bursa: [40.1826, 29.0669],
  antalya: [36.8969, 30.7133],
  trabzon: [41.0027, 39.7168],
  erzurum: [39.9055, 41.2659],
};

export const getStaticCoordinatesFromLocation = (location: string): LatLngTuple | null => {
  const norm = trNormalize(location);

  for (const [district, coords] of Object.entries(ISTANBUL_DISTRICTS)) {
    if (norm.includes(district)) return coords;
  }

  for (const [city, coords] of Object.entries(CITY_CENTERS)) {
    if (norm.includes(city)) return coords;
  }

  return null;
};

const nominatimCache = new Map<string, Promise<LatLngTuple | null>>();

export const geocodeWithNominatim = async (location: string): Promise<LatLngTuple | null> => {
  const query = location.trim();
  if (!query) return null;

  const key = trNormalize(query);
  const cached = nominatimCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    try {
      // Nominatim usage policy: keep it light; we also cache results in-memory.
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");
      url.searchParams.set("q", `${query}, Türkiye`);

      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) return null;
      const json = (await res.json()) as Array<{ lat: string; lon: string }>;
      const first = json?.[0];
      if (!first?.lat || !first?.lon) return null;

      const lat = Number(first.lat);
      const lon = Number(first.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

      return [lat, lon];
    } catch {
      return null;
    }
  })();

  nominatimCache.set(key, promise);
  return promise;
};

export const resolveCoordinatesFromLocation = async (location: string): Promise<LatLngTuple | null> => {
  return getStaticCoordinatesFromLocation(location) ?? (await geocodeWithNominatim(location));
};

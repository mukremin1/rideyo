import { supabase } from "@/integrations/supabase/client";

export type RegionLevel = "bolge" | "il" | "ilce" | "mahalle";

export type AllowedRegion = {
  id: string;
  parent_id: string | null;
  level: RegionLevel;
  name: string;
  description: string | null;
  boundaries: GeoJsonPolygon | null;
  is_active: boolean;
  sort_order: number;
};

export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export type ParsedLocation = {
  il: string;
  ilce: string;
  mahalle: string;
  displayAddress: string;
};

export type LocationValidation = {
  allowed: boolean;
  strictMode: boolean;
  regionId: string | null;
  matchedRegionName: string | null;
  parsed: ParsedLocation;
  reason?: string;
};

const normalize = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");

const namesMatch = (a: string, b: string) => {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
};

export function parseNominatimAddress(
  address: Record<string, string> | undefined,
  displayName = "",
): ParsedLocation {
  const addr = address ?? {};
  const il =
    addr.state ||
    addr.province ||
    addr.city ||
    addr.region ||
    "";
  const ilce =
    addr.county ||
    addr.city_district ||
    addr.town ||
    addr.district ||
    addr.municipality ||
    "";
  const mahalle =
    addr.suburb ||
    addr.neighbourhood ||
    addr.quarter ||
    addr.residential ||
    addr.hamlet ||
    "";

  return {
    il: il.trim(),
    ilce: ilce.trim(),
    mahalle: mahalle.trim(),
    displayAddress: displayName.trim(),
  };
}

function pointInPolygon(lat: number, lng: number, polygon: GeoJsonPolygon): boolean {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 4) return false;

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export async function fetchAllowedRegions(includeInactive = false): Promise<AllowedRegion[]> {
  let query = supabase
    .from("allowed_regions")
    .select("id, parent_id, level, name, description, boundaries, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    boundaries: (row.boundaries as GeoJsonPolygon | null) ?? null,
  })) as AllowedRegion[];
}

export function validateLocationAgainstRegions(
  regions: AllowedRegion[],
  parsed: ParsedLocation,
  lat: number | null,
  lng: number | null,
): LocationValidation {
  const active = regions.filter((r) => r.is_active);
  const strictMode = active.length > 0;

  const base: LocationValidation = {
    allowed: !strictMode,
    strictMode,
    regionId: null,
    matchedRegionName: null,
    parsed,
  };

  if (!strictMode) {
    return base;
  }

  if (lat != null && lng != null) {
    for (const bolge of active.filter((r) => r.level === "bolge" && r.boundaries)) {
      if (pointInPolygon(lat, lng, r.boundaries!)) {
        return {
          ...base,
          allowed: true,
          regionId: bolge.id,
          matchedRegionName: bolge.name,
        };
      }
    }
  }

  const ilCandidates = active.filter((r) => r.level === "il");
  const ilMatch =
    ilCandidates.find((r) => namesMatch(r.name, parsed.il)) ||
    ilCandidates.find((r) => namesMatch(r.name, parsed.displayAddress));

  if (!ilMatch) {
    return {
      ...base,
      allowed: false,
      reason: "il_not_allowed",
    };
  }

  const ilceChildren = active.filter((r) => r.level === "ilce" && r.parent_id === ilMatch.id);
  if (ilceChildren.length === 0) {
    return {
      ...base,
      allowed: true,
      regionId: ilMatch.id,
      matchedRegionName: ilMatch.name,
    };
  }

  const ilceMatch =
    ilceChildren.find((r) => namesMatch(r.name, parsed.ilce)) ||
    ilceChildren.find((r) => namesMatch(r.name, parsed.displayAddress));

  if (!ilceMatch) {
    return {
      ...base,
      allowed: false,
      reason: "ilce_not_allowed",
    };
  }

  const mahalleChildren = active.filter(
    (r) => r.level === "mahalle" && r.parent_id === ilceMatch.id,
  );
  if (mahalleChildren.length === 0) {
    return {
      ...base,
      allowed: true,
      regionId: ilceMatch.id,
      matchedRegionName: `${ilMatch.name} / ${ilceMatch.name}`,
    };
  }

  const mahalleMatch =
    mahalleChildren.find((r) => namesMatch(r.name, parsed.mahalle)) ||
    mahalleChildren.find((r) => namesMatch(r.name, parsed.displayAddress));

  if (!mahalleMatch) {
    return {
      ...base,
      allowed: false,
      reason: "mahalle_not_allowed",
    };
  }

  return {
    ...base,
    allowed: true,
    regionId: mahalleMatch.id,
    matchedRegionName: `${ilMatch.name} / ${ilceMatch.name} / ${mahalleMatch.name}`,
  };
}

export function getAllowedIlNames(regions: AllowedRegion[]): string[] {
  return regions
    .filter((r) => r.level === "il" && r.is_active)
    .map((r) => r.name)
    .sort((a, b) => a.localeCompare(b, "tr"));
}

export function filterProvinceNames(
  provinceNames: string[],
  regions: AllowedRegion[],
): string[] {
  const allowedIls = getAllowedIlNames(regions);
  if (allowedIls.length === 0) return provinceNames;
  return provinceNames.filter((name) =>
    allowedIls.some((il) => namesMatch(il, name)),
  );
}

export function filterDistrictNames(
  districtNames: string[],
  regions: AllowedRegion[],
  ilName: string,
): string[] {
  const active = regions.filter((r) => r.is_active);
  if (active.length === 0) return districtNames;

  const allowedIls = getAllowedIlNames(regions);
  if (allowedIls.length > 0 && !allowedIls.some((il) => namesMatch(il, ilName))) {
    return [];
  }

  // İl seçildiyse tüm ilçeler listede — onay kontrolü kayıt sırasında yapılır
  return districtNames;
}

export function filterNeighborhoodNames(
  neighborhoodNames: string[],
  regions: AllowedRegion[],
  ilName: string,
  _districtName: string,
): string[] {
  const active = regions.filter((r) => r.is_active);
  if (active.length === 0) return neighborhoodNames;

  const allowedIls = getAllowedIlNames(regions);
  if (allowedIls.length > 0 && !allowedIls.some((il) => namesMatch(il, ilName))) {
    return [];
  }

  // İlçe seçildiyse tüm mahalleler listede
  return neighborhoodNames;
}

export function getRegionLevelLabel(level: RegionLevel, t: (key: string) => string): string {
  return t(`admin.regions.levels.${level}`);
}

export async function reverseGeocodeCoords(
  lat: number,
  lng: number,
  language = "tr",
): Promise<{ address: string; parsed: ParsedLocation }> {
  const lang = language.split("-")[0] ?? "tr";
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "json");
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lng.toString());
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", lang);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error("GEOCODE_FAILED");
  }

  const data = await res.json();
  const address = (data.display_name as string) || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  const parsed = parseNominatimAddress(data.address as Record<string, string>, address);
  return { address, parsed };
}

export function getRegionErrorKey(reason?: string): string {
  switch (reason) {
    case "il_not_allowed":
    case "ilce_not_allowed":
    case "mahalle_not_allowed":
    case "missing_coordinates":
      return reason;
    default:
      return "notAllowed";
  }
}

export async function validateDropoffCoords(
  lat: number,
  lng: number,
  language = "tr",
): Promise<LocationValidation & { address: string }> {
  const regions = await fetchAllowedRegions();
  const { address, parsed } = await reverseGeocodeCoords(lat, lng, language);
  const result = validateLocationAgainstRegions(regions, parsed, lat, lng);
  return { ...result, address };
}

import { TURKEY_CITIES } from "@/lib/turkeyCities";

const API_BASE = "https://api.turkiyeapi.dev/v1";

export type TurkeyProvince = {
  id: number;
  name: string;
};

export type TurkeyDistrict = {
  id: number;
  name: string;
  province: string;
  neighborhoods?: TurkeyNeighborhood[];
};

export type TurkeyNeighborhood = {
  id: number;
  name: string;
  district: string;
  province: string;
};

type ApiList<T> = { status: string; data: T[] };

let provincesCache: TurkeyProvince[] | null = null;
const districtsCache = new Map<string, TurkeyDistrict[]>();
const neighborhoodsCache = new Map<string, TurkeyNeighborhood[]>();

const FETCH_TIMEOUT_MS = 15_000;

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchTurkeyProvinces(): Promise<TurkeyProvince[]> {
  if (provincesCache) return provincesCache;
  try {
    const json = await fetchJson<ApiList<{ id: number; name: string }>>(`${API_BASE}/provinces`);
    provincesCache = json.data.map((p) => ({ id: p.id, name: p.name }));
    return provincesCache;
  } catch {
    provincesCache = TURKEY_CITIES.map((name, index) => ({ id: index + 1, name }));
    return provincesCache;
  }
}

export async function fetchTurkeyDistricts(provinceName: string): Promise<TurkeyDistrict[]> {
  const key = provinceName.toLocaleLowerCase("tr");
  if (districtsCache.has(key)) return districtsCache.get(key)!;

  try {
    const provinces = await fetchTurkeyProvinces();
    const province = provinces.find(
      (p) => p.name.toLocaleLowerCase("tr") === key,
    );
    const query = province
      ? `provinceId=${province.id}`
      : `province=${encodeURIComponent(provinceName)}`;

    const json = await fetchJson<
      ApiList<{
        id: number;
        name: string;
        province: string;
        neighborhoods?: { id: number; name: string }[];
      }>
    >(`${API_BASE}/districts?${query}`);

    const districts: TurkeyDistrict[] = json.data.map((d) => ({
      id: d.id,
      name: d.name,
      province: d.province,
      neighborhoods: d.neighborhoods?.map((n) => ({
        id: n.id,
        name: n.name,
        district: d.name,
        province: d.province,
      })),
    }));

    districtsCache.set(key, districts);
    return districts;
  } catch {
    return [];
  }
}

export async function fetchTurkeyNeighborhoods(
  provinceName: string,
  districtName: string,
  district?: TurkeyDistrict,
): Promise<TurkeyNeighborhood[]> {
  if (district?.neighborhoods?.length) return district.neighborhoods;

  const key = `${provinceName}:${districtName}`.toLocaleLowerCase("tr");
  if (neighborhoodsCache.has(key)) return neighborhoodsCache.get(key)!;

  try {
    const json = await fetchJson<
      ApiList<{ id: number; name: string; district: string; province: string }>
    >(
      `${API_BASE}/neighborhoods?province=${encodeURIComponent(provinceName)}&district=${encodeURIComponent(districtName)}`,
    );

    const rows = json.data.map((n) => ({
      id: n.id,
      name: n.name,
      district: n.district,
      province: n.province,
    }));

    neighborhoodsCache.set(key, rows);
    return rows;
  } catch {
    return [];
  }
}

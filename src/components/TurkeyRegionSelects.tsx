import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchTurkeyDistricts,
  fetchTurkeyNeighborhoods,
  fetchTurkeyProvinces,
} from "@/lib/turkeyAdminApi";
import {
  filterDistrictNames,
  filterNeighborhoodNames,
  filterProvinceNames,
  type AllowedRegion,
} from "@/lib/allowedRegions";

export type TurkeyRegionValue = {
  il: string;
  ilce: string;
  mahalle: string;
};

type TurkeyRegionSelectsProps = {
  value: TurkeyRegionValue;
  onChange: (value: TurkeyRegionValue) => void;
  allowedRegions?: AllowedRegion[];
  /** Admin: tüm iller; araç sahibi: sadece onaylı iller */
  restrictProvinces?: boolean;
  disabled?: boolean;
  showMahalle?: boolean;
  idPrefix?: string;
};

const EMPTY_ALLOWED_REGIONS: AllowedRegion[] = [];

const TurkeyRegionSelects = ({
  value,
  onChange,
  allowedRegions: allowedRegionsProp,
  restrictProvinces = true,
  disabled = false,
  showMahalle = true,
  idPrefix = "region",
}: TurkeyRegionSelectsProps) => {
  const { t } = useTranslation();
  const allowedRegions = allowedRegionsProp ?? EMPTY_ALLOWED_REGIONS;
  const allowedRegionsKey = useMemo(
    () =>
      allowedRegions
        .map((r) => `${r.id}:${r.level}:${r.name}:${r.is_active ? 1 : 0}`)
        .join("|"),
    [allowedRegions],
  );
  const [provinces, setProvinces] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const [districtsError, setDistrictsError] = useState(false);
  const [neighborhoodsError, setNeighborhoodsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingProvinces(true);
    void fetchTurkeyProvinces()
      .then((rows) => {
        if (cancelled) return;
        const names = rows.map((p) => p.name).sort((a, b) => a.localeCompare(b, "tr"));
        setProvinces(
          restrictProvinces ? filterProvinceNames(names, allowedRegions) : names,
        );
      })
      .catch(() => {
        if (!cancelled) setProvinces([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProvinces(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allowedRegionsKey, restrictProvinces, allowedRegions]);

  useEffect(() => {
    if (!value.il) {
      setDistricts([]);
      setNeighborhoods([]);
      setLoadingDistricts(false);
      setDistrictsError(false);
      return;
    }
    let cancelled = false;
    setLoadingDistricts(true);
    setDistrictsError(false);
    void fetchTurkeyDistricts(value.il)
      .then((rows) => {
        if (cancelled) return;
        const names = rows.map((d) => d.name).sort((a, b) => a.localeCompare(b, "tr"));
        setDistricts(filterDistrictNames(names, allowedRegions, value.il));
        setDistrictsError(names.length === 0);
      })
      .catch(() => {
        if (!cancelled) {
          setDistricts([]);
          setDistrictsError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDistricts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [value.il, allowedRegionsKey, allowedRegions]);

  useEffect(() => {
    if (!value.il || !value.ilce || !showMahalle) {
      setNeighborhoods([]);
      setLoadingNeighborhoods(false);
      return;
    }
    let cancelled = false;
    setLoadingNeighborhoods(true);
    setNeighborhoodsError(false);
    void fetchTurkeyNeighborhoods(value.il, value.ilce)
      .then((rows) => {
        if (cancelled) return;
        const names = rows.map((n) => n.name).sort((a, b) => a.localeCompare(b, "tr"));
        setNeighborhoods(
          filterNeighborhoodNames(names, allowedRegions, value.il, value.ilce),
        );
        setNeighborhoodsError(names.length === 0);
      })
      .catch(() => {
        if (!cancelled) {
          setNeighborhoods([]);
          setNeighborhoodsError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingNeighborhoods(false);
      });
    return () => {
      cancelled = true;
    };
  }, [value.il, value.ilce, allowedRegionsKey, allowedRegions, showMahalle]);

  const ilPlaceholder = loadingProvinces
    ? t("common.region.loading")
    : t("common.region.ilPlaceholder");
  const ilcePlaceholder = !value.il
    ? t("common.region.pickIlFirst")
    : loadingDistricts
      ? t("common.region.loading")
      : districtsError
        ? t("common.region.loadError")
        : t("common.region.ilcePlaceholder");
  const mahallePlaceholder = !value.ilce
    ? t("common.region.pickIlceFirst")
    : loadingNeighborhoods
      ? t("common.region.loading")
      : neighborhoodsError
        ? t("common.region.loadError")
        : t("common.region.mahallePlaceholder");

  const onIlChange = (il: string) => {
    onChange({ il, ilce: "", mahalle: "" });
  };

  const onIlceChange = (ilce: string) => {
    onChange({ ...value, ilce, mahalle: "" });
  };

  const onMahalleChange = (mahalle: string) => {
    onChange({ ...value, mahalle });
  };

  const emptyIlce = !loadingDistricts && value.il && districts.length === 0;
  const emptyMahalle = !loadingNeighborhoods && value.ilce && neighborhoods.length === 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-il`}>{t("common.region.il")}</Label>
        <Select
          value={value.il || undefined}
          onValueChange={onIlChange}
          disabled={disabled || loadingProvinces}
        >
          <SelectTrigger id={`${idPrefix}-il`}>
            <SelectValue placeholder={ilPlaceholder} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {provinces.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-ilce`}>{t("common.region.ilce")}</Label>
        <Select
          value={value.ilce || undefined}
          onValueChange={onIlceChange}
          disabled={disabled || !value.il || loadingDistricts || emptyIlce}
        >
          <SelectTrigger id={`${idPrefix}-ilce`}>
            <SelectValue placeholder={ilcePlaceholder} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {districts.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showMahalle && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-mahalle`}>{t("common.region.mahalle")}</Label>
          <Select
            value={value.mahalle || undefined}
            onValueChange={onMahalleChange}
            disabled={disabled || !value.ilce || loadingNeighborhoods || emptyMahalle}
          >
            <SelectTrigger id={`${idPrefix}-mahalle`}>
              <SelectValue placeholder={mahallePlaceholder} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {neighborhoods.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default TurkeyRegionSelects;

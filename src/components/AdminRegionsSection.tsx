import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  type AllowedRegion,
  type RegionLevel,
  fetchAllowedRegions,
  getRegionLevelLabel,
} from "@/lib/allowedRegions";
import {
  fetchTurkeyDistricts,
  fetchTurkeyNeighborhoods,
  fetchTurkeyProvinces,
  type TurkeyDistrict,
  type TurkeyNeighborhood,
} from "@/lib/turkeyAdminApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronDown,
  ChevronRight,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";

const normalizeKey = (value: string) => value.trim().toLocaleLowerCase("tr");

function findRegion(
  regions: AllowedRegion[],
  level: RegionLevel,
  name: string,
  parentId: string | null,
): AllowedRegion | undefined {
  return regions.find(
    (r) =>
      r.level === level &&
      normalizeKey(r.name) === normalizeKey(name) &&
      (r.parent_id ?? null) === parentId,
  );
}

const AdminRegionsSection = () => {
  const { t } = useTranslation();
  const [regions, setRegions] = useState<AllowedRegion[]>([]);
  const [provinces, setProvinces] = useState<{ id: number; name: string }[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("Trabzon");
  const [districts, setDistricts] = useState<TurkeyDistrict[]>([]);
  const [neighborhoodsByDistrict, setNeighborhoodsByDistrict] = useState<
    Record<string, TurkeyNeighborhood[]>
  >({});
  const [expandedDistricts, setExpandedDistricts] = useState<Record<string, boolean>>({});
  const [loadingDistricts, setLoadingDistricts] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [bolgeForm, setBolgeForm] = useState({ name: "", description: "", boundaries: "" });

  const loadRegions = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAllowedRegions(true);
      setRegions(rows);
    } catch {
      toast.error(t("admin.regions.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadRegions();
    void fetchTurkeyProvinces().then(setProvinces);
  }, [loadRegions]);

  useEffect(() => {
    if (!selectedProvince) return;
    setLoadingGeo(true);
    setDistricts([]);
    setNeighborhoodsByDistrict({});
    setExpandedDistricts({});
    void fetchTurkeyDistricts(selectedProvince)
      .then(setDistricts)
      .catch(() => toast.error(t("admin.regions.geoLoadError")))
      .finally(() => setLoadingGeo(false));
  }, [selectedProvince, t]);

  const ilRegion = useMemo(
    () => findRegion(regions, "il", selectedProvince, null),
    [regions, selectedProvince],
  );

  const isIlActive = Boolean(ilRegion?.is_active);

  const filteredDistricts = useMemo(() => {
    const q = normalizeKey(search);
    if (!q) return districts;
    return districts.filter((d) => {
      if (normalizeKey(d.name).includes(q)) return true;
      const hoods = neighborhoodsByDistrict[d.name] ?? d.neighborhoods ?? [];
      return hoods.some((n) => normalizeKey(n.name).includes(q));
    });
  }, [districts, neighborhoodsByDistrict, search]);

  const stats = useMemo(
    () => ({
      total: regions.filter((r) => r.is_active).length,
      il: regions.filter((r) => r.level === "il" && r.is_active).length,
      ilce: regions.filter((r) => r.level === "ilce" && r.is_active).length,
      mahalle: regions.filter((r) => r.level === "mahalle" && r.is_active).length,
      bolge: regions.filter((r) => r.level === "bolge" && r.is_active).length,
    }),
    [regions],
  );

  const upsertRegion = async (
    level: RegionLevel,
    name: string,
    parentId: string | null,
    isActive: boolean,
  ) => {
    const existing = findRegion(regions, level, name, parentId);
    if (existing) {
      const { error } = await supabase
        .from("allowed_regions")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
      return;
    }
    if (!isActive) return;
    const { error } = await supabase.from("allowed_regions").insert({
      level,
      name: name.trim(),
      parent_id: parentId,
      is_active: true,
      sort_order: regions.length + 1,
    });
    if (error) throw error;
  };

  const withSaving = async (key: string, fn: () => Promise<void>) => {
    setSavingKey(key);
    try {
      await fn();
      await loadRegions();
    } catch {
      toast.error(t("admin.regions.toggleError"));
    } finally {
      setSavingKey(null);
    }
  };

  const ensureIlId = async (): Promise<string> => {
    let il = findRegion(regions, "il", selectedProvince, null);
    if (!il) {
      const { data, error } = await supabase
        .from("allowed_regions")
        .insert({
          level: "il",
          name: selectedProvince,
          parent_id: null,
          is_active: true,
          sort_order: 1,
        })
        .select("id")
        .single();
      if (error) throw error;
      await loadRegions();
      return data.id;
    }
    if (!il.is_active) {
      await supabase
        .from("allowed_regions")
        .update({ is_active: true })
        .eq("id", il.id);
      await loadRegions();
    }
    return il.id;
  };

  const toggleIl = (active: boolean) =>
    void withSaving(`il:${selectedProvince}`, () =>
      upsertRegion("il", selectedProvince, null, active),
    );

  const toggleIlce = (districtName: string, active: boolean) =>
    void withSaving(`ilce:${districtName}`, async () => {
      const ilId = active ? await ensureIlId() : ilRegion?.id ?? null;
      if (!ilId && active) return;
      await upsertRegion("ilce", districtName, ilId, active);
    });

  const toggleMahalle = (districtName: string, mahalleName: string, active: boolean) =>
    void withSaving(`mahalle:${districtName}:${mahalleName}`, async () => {
      const ilId = await ensureIlId();
      let ilce = findRegion(regions, "ilce", districtName, ilId);
      if (!ilce && active) {
        await upsertRegion("ilce", districtName, ilId, true);
        const fresh = await fetchAllowedRegions(true);
        setRegions(fresh);
        ilce = findRegion(fresh, "ilce", districtName, ilId);
      }
      if (!ilce?.id) return;
      await upsertRegion("mahalle", mahalleName, ilce.id, active);
    });

  const toggleAllDistricts = (active: boolean) =>
    void withSaving(`all-ilce:${selectedProvince}`, async () => {
      const ilId = active ? await ensureIlId() : ilRegion?.id ?? null;
      for (const d of districts) {
        await upsertRegion("ilce", d.name, ilId, active);
      }
    });

  const toggleAllMahalle = (district: TurkeyDistrict, active: boolean) =>
    void withSaving(`all-mahalle:${district.name}`, async () => {
      const hoods =
        neighborhoodsByDistrict[district.name] ??
        district.neighborhoods ??
        (await loadNeighborhoods(district));
      const ilId = await ensureIlId();
      let ilce = findRegion(regions, "ilce", district.name, ilId);
      if (!ilce) {
        await upsertRegion("ilce", district.name, ilId, true);
        const fresh = await fetchAllowedRegions(true);
        ilce = findRegion(fresh, "ilce", district.name, ilId);
      }
      if (!ilce?.id) return;
      for (const n of hoods) {
        await upsertRegion("mahalle", n.name, ilce.id, active);
      }
      await loadRegions();
    });

  const loadNeighborhoods = async (district: TurkeyDistrict) => {
    if (neighborhoodsByDistrict[district.name]?.length) {
      return neighborhoodsByDistrict[district.name];
    }
    setLoadingDistricts((prev) => ({ ...prev, [district.name]: true }));
    try {
      const rows = await fetchTurkeyNeighborhoods(
        selectedProvince,
        district.name,
        district,
      );
      setNeighborhoodsByDistrict((prev) => ({ ...prev, [district.name]: rows }));
      return rows;
    } finally {
      setLoadingDistricts((prev) => ({ ...prev, [district.name]: false }));
    }
  };

  const onDistrictOpen = (district: TurkeyDistrict, open: boolean) => {
    setExpandedDistricts((prev) => ({ ...prev, [district.name]: open }));
    if (open) void loadNeighborhoods(district);
  };

  const isIlceActive = (name: string) => {
    if (!ilRegion?.id) return false;
    const row = findRegion(regions, "ilce", name, ilRegion.id);
    return Boolean(row?.is_active);
  };

  const isMahalleActive = (districtName: string, mahalleName: string) => {
    if (!ilRegion?.id) return false;
    const ilce = findRegion(regions, "ilce", districtName, ilRegion.id);
    if (!ilce?.id) return false;
    const row = findRegion(regions, "mahalle", mahalleName, ilce.id);
    return Boolean(row?.is_active);
  };

  const handleAddBolge = async () => {
    if (!bolgeForm.name.trim()) {
      toast.error(t("admin.regions.nameRequired"));
      return;
    }
    let boundaries: unknown = null;
    if (bolgeForm.boundaries.trim()) {
      try {
        boundaries = JSON.parse(bolgeForm.boundaries);
      } catch {
        toast.error(t("admin.regions.invalidBoundaries"));
        return;
      }
    }
    const ilId = ilRegion?.id ?? (await ensureIlId());
    const { error } = await supabase.from("allowed_regions").insert({
      level: "bolge",
      parent_id: ilId,
      name: bolgeForm.name.trim(),
      description: bolgeForm.description.trim() || null,
      boundaries,
      is_active: true,
      sort_order: regions.length + 1,
    });
    if (error) {
      toast.error(t("admin.regions.saveError"));
      return;
    }
    toast.success(t("admin.regions.saveSuccess"));
    setBolgeForm({ name: "", description: "", boundaries: "" });
    void loadRegions();
  };

  const filterNeighborhoods = (districtName: string, list: TurkeyNeighborhood[]) => {
    const q = normalizeKey(search);
    if (!q) return list;
    return list.filter((n) => normalizeKey(n.name).includes(q));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">{t("admin.regions.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.regions.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadRegions()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("admin.regions.refresh")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { key: "total", label: t("admin.regions.statsActive"), value: stats.total },
          { key: "il", label: t("admin.regions.levels.il"), value: stats.il },
          { key: "ilce", label: t("admin.regions.levels.ilce"), value: stats.ilce },
          { key: "mahalle", label: t("admin.regions.levels.mahalle"), value: stats.mahalle },
          { key: "bolge", label: t("admin.regions.levels.bolge"), value: stats.bolge },
        ].map((item) => (
          <Card key={item.key}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="selection" className="space-y-4">
        <TabsList>
          <TabsTrigger value="selection">{t("admin.regions.tabSelection")}</TabsTrigger>
          <TabsTrigger value="bolge">{t("admin.regions.tabCustomZones")}</TabsTrigger>
        </TabsList>

        <TabsContent value="selection" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("admin.regions.selectProvince")}</Label>
                  <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {provinces.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.regions.searchAreas")}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("admin.regions.searchPlaceholder")}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                <div>
                  <p className="font-semibold">{selectedProvince}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("admin.regions.provinceHint")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isIlActive}
                      disabled={savingKey === `il:${selectedProvince}`}
                      onCheckedChange={toggleIl}
                    />
                    <span className="text-sm">{t("admin.regions.active")}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!!savingKey || loadingGeo}
                    onClick={() => toggleAllDistricts(true)}
                  >
                    {t("admin.regions.enableAllDistricts")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!!savingKey || loadingGeo}
                    onClick={() => toggleAllDistricts(false)}
                  >
                    {t("admin.regions.disableAllDistricts")}
                  </Button>
                </div>
              </div>

              {loadingGeo ? (
                <p className="py-8 text-center text-muted-foreground">
                  {t("admin.regions.loadingDistricts")}
                </p>
              ) : (
                <ScrollArea className="h-[min(70vh,560px)] pr-3">
                  <div className="space-y-2">
                    {filteredDistricts.map((district) => {
                      const hoods =
                        neighborhoodsByDistrict[district.name] ?? district.neighborhoods ?? [];
                      const visibleHoods = filterNeighborhoods(district.name, hoods);
                      const open = expandedDistricts[district.name] ?? false;
                      const ilceActive = isIlceActive(district.name);

                      return (
                        <Collapsible
                          key={district.id}
                          open={open}
                          onOpenChange={(v) => onDistrictOpen(district, v)}
                        >
                          <Card>
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <CollapsibleTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                  >
                                    {open ? (
                                      <ChevronDown className="h-4 w-4 shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 shrink-0" />
                                    )}
                                    <span className="font-medium">{district.name}</span>
                                    <Badge variant="outline">{t("admin.regions.levels.ilce")}</Badge>
                                    {hoods.length > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        {hoods.length} {t("admin.regions.levels.mahalle")}
                                      </span>
                                    )}
                                  </button>
                                </CollapsibleTrigger>
                                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                                  <Switch
                                    checked={ilceActive}
                                    disabled={savingKey === `ilce:${district.name}`}
                                    onCheckedChange={(v) => toggleIlce(district.name, v)}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs"
                                    disabled={!!savingKey}
                                    onClick={() => void toggleAllMahalle(district, true)}
                                  >
                                    {t("admin.regions.enableAllNeighborhoods")}
                                  </Button>
                                </div>
                              </div>

                              <CollapsibleContent className="mt-3 border-t pt-3">
                                {loadingDistricts[district.name] ? (
                                  <p className="text-sm text-muted-foreground py-2">
                                    {t("admin.regions.loadingNeighborhoods")}
                                  </p>
                                ) : visibleHoods.length === 0 ? (
                                  <p className="text-sm text-muted-foreground py-2">
                                    {t("admin.regions.noNeighborhoods")}
                                  </p>
                                ) : (
                                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {visibleHoods.map((n) => (
                                      <label
                                        key={n.id}
                                        className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                                      >
                                        <span className="min-w-0 truncate">{n.name}</span>
                                        <Switch
                                          checked={isMahalleActive(district.name, n.name)}
                                          disabled={
                                            savingKey === `mahalle:${district.name}:${n.name}`
                                          }
                                          onCheckedChange={(v) =>
                                            toggleMahalle(district.name, n.name, v)
                                          }
                                        />
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </CollapsibleContent>
                            </CardContent>
                          </Card>
                        </Collapsible>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bolge">
          <Card>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <h3 className="flex items-center gap-2 font-semibold">
                <MapPin className="h-4 w-4" />
                {t("admin.regions.addTitle")}
              </h3>
              <p className="text-sm text-muted-foreground">{t("admin.regions.bolgeHint")}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("admin.regions.name")}</Label>
                  <Input
                    value={bolgeForm.name}
                    onChange={(e) => setBolgeForm({ ...bolgeForm, name: e.target.value })}
                    placeholder={t("admin.regions.namePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.regions.description")}</Label>
                  <Input
                    value={bolgeForm.description}
                    onChange={(e) =>
                      setBolgeForm({ ...bolgeForm, description: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.regions.boundaries")}</Label>
                <Textarea
                  value={bolgeForm.boundaries}
                  onChange={(e) => setBolgeForm({ ...bolgeForm, boundaries: e.target.value })}
                  placeholder={t("admin.regions.boundariesPlaceholder")}
                  rows={4}
                  className="font-mono text-xs"
                />
              </div>
              <Button onClick={() => void handleAddBolge()}>
                <Plus className="mr-2 h-4 w-4" />
                {t("admin.regions.addButton")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-dashed">
        <CardContent className="flex gap-3 p-4 text-sm text-muted-foreground">
          <Layers className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t("admin.regions.hint")}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRegionsSection;

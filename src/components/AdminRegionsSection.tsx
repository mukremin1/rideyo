import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  type AllowedRegion,
  type RegionLevel,
  fetchAllowedRegions,
  getRegionLevelLabel,
} from "@/lib/allowedRegions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Plus, RefreshCw, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";

const LEVELS: RegionLevel[] = ["il", "ilce", "mahalle", "bolge"];

const AdminRegionsSection = () => {
  const { t } = useTranslation();
  const [regions, setRegions] = useState<AllowedRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<RegionLevel | "all">("all");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    level: "il" as RegionLevel,
    parentId: "",
    name: "",
    description: "",
    boundaries: "",
  });

  const load = useCallback(async () => {
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
    void load();
  }, [load]);

  const regionById = useMemo(
    () => Object.fromEntries(regions.map((r) => [r.id, r])),
    [regions],
  );

  const parentOptions = useMemo(() => {
    if (form.level === "il") return [];
    if (form.level === "ilce") return regions.filter((r) => r.level === "il");
    if (form.level === "mahalle") return regions.filter((r) => r.level === "ilce");
    return regions.filter((r) => r.level === "il" || r.level === "ilce");
  }, [form.level, regions]);

  const filtered = useMemo(() => {
    const list = levelFilter === "all" ? regions : regions.filter((r) => r.level === levelFilter);
    return [...list].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "tr"));
  }, [regions, levelFilter]);

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

  const parentLabel = (region: AllowedRegion) => {
    if (!region.parent_id) return "—";
    const parent = regionById[region.parent_id];
    return parent ? `${getRegionLevelLabel(parent.level, t)}: ${parent.name}` : "—";
  };

  const resetForm = () => {
    setForm({ level: "il", parentId: "", name: "", description: "", boundaries: "" });
  };

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast.error(t("admin.regions.nameRequired"));
      return;
    }
    if (form.level !== "il" && !form.parentId) {
      toast.error(t("admin.regions.parentRequired"));
      return;
    }

    let boundaries: unknown = null;
    if (form.level === "bolge" && form.boundaries.trim()) {
      try {
        boundaries = JSON.parse(form.boundaries);
      } catch {
        toast.error(t("admin.regions.invalidBoundaries"));
        return;
      }
    }

    setSaving(true);
    const { error } = await supabase.from("allowed_regions").insert({
      level: form.level,
      parent_id: form.level === "il" ? null : form.parentId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      boundaries,
      is_active: true,
      sort_order: regions.length + 1,
    });

    setSaving(false);
    if (error) {
      toast.error(t("admin.regions.saveError"));
      return;
    }
    toast.success(t("admin.regions.saveSuccess"));
    resetForm();
    void load();
  };

  const toggleActive = async (region: AllowedRegion) => {
    const { error } = await supabase
      .from("allowed_regions")
      .update({ is_active: !region.is_active, updated_at: new Date().toISOString() })
      .eq("id", region.id);

    if (error) {
      toast.error(t("admin.regions.toggleError"));
      return;
    }
    void load();
  };

  const deleteRegion = async (id: string) => {
    const { error } = await supabase.from("allowed_regions").delete().eq("id", id);
    if (error) {
      toast.error(t("admin.regions.deleteError"));
      return;
    }
    toast.success(t("admin.regions.deleteSuccess"));
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">{t("admin.regions.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.regions.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
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

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <h3 className="flex items-center gap-2 font-semibold">
            <Plus className="h-4 w-4" />
            {t("admin.regions.addTitle")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("admin.regions.level")}</Label>
              <Select
                value={form.level}
                onValueChange={(v) => setForm({ ...form, level: v as RegionLevel, parentId: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {getRegionLevelLabel(level, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.level !== "il" && (
              <div className="space-y-2">
                <Label>{t("admin.regions.parent")}</Label>
                <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.regions.parentPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {parentOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({getRegionLevelLabel(p.level, t)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("admin.regions.name")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("admin.regions.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.regions.description")}</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t("admin.regions.descriptionPlaceholder")}
              />
            </div>
          </div>
          {form.level === "bolge" && (
            <div className="space-y-2">
              <Label>{t("admin.regions.boundaries")}</Label>
              <Textarea
                value={form.boundaries}
                onChange={(e) => setForm({ ...form, boundaries: e.target.value })}
                placeholder={t("admin.regions.boundariesPlaceholder")}
                rows={4}
                className="font-mono text-xs"
              />
            </div>
          )}
          <Button onClick={() => void handleAdd()} disabled={saving}>
            {saving ? t("admin.regions.saving") : t("admin.regions.addButton")}
          </Button>
        </CardContent>
      </Card>

      <Tabs value={levelFilter} onValueChange={(v) => setLevelFilter(v as RegionLevel | "all")}>
        <TabsList className="flex h-auto w-full flex-wrap gap-1">
          <TabsTrigger value="all">{t("admin.regions.filterAll")}</TabsTrigger>
          {LEVELS.map((level) => (
            <TabsTrigger key={level} value={level}>
              {getRegionLevelLabel(level, t)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">{t("admin.regions.loading")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{t("admin.regions.empty")}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((region) => (
            <Card key={region.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{region.name}</span>
                    <Badge variant="outline">{getRegionLevelLabel(region.level, t)}</Badge>
                    {!region.is_active && (
                      <Badge variant="secondary">{t("admin.regions.inactive")}</Badge>
                    )}
                    {region.boundaries && (
                      <Badge className="gap-1">
                        <MapPin className="h-3 w-3" />
                        {t("admin.regions.hasPolygon")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("admin.regions.parentLabel")}: {parentLabel(region)}
                  </p>
                  {region.description && (
                    <p className="text-sm text-muted-foreground">{region.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={region.is_active}
                      onCheckedChange={() => void toggleActive(region)}
                    />
                    <span className="text-sm">{t("admin.regions.active")}</span>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("admin.regions.deleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("admin.regions.deleteDesc", { name: region.name })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void deleteRegion(region.id)}>
                          {t("admin.regions.delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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

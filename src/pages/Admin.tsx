import { useState, useEffect } from "react";
import { mobilePageShell, mobileTopInset } from "@/lib/mobileLayout";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Calendar as CalendarIcon, Megaphone, Car, ClipboardList, Wallet, MapPinned, Headphones, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminFleetSection from "@/components/AdminFleetSection";
import AdminRentalsSection from "@/components/AdminRentalsSection";
import AdminPayoutsSection from "@/components/AdminPayoutsSection";
import AdminRegionsSection from "@/components/AdminRegionsSection";
import AdminSupportSection from "@/components/AdminSupportSection";
import AdminGpsSection from "@/components/AdminGpsSection";

interface Campaign {
  id: string;
  name: string;
  description: string;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  car_types: string[] | null;
}

const Admin = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    discount_percentage: 10,
    start_date: new Date(),
    end_date: new Date(),
    is_active: true,
    car_types: [] as string[],
  });

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchCampaigns();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    if (!user) {
      setLoading(false);
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error || !data) {
        toast.error(t("admin.noAccess"));
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch {
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCampaigns(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const campaignData = {
      name: formData.name,
      description: formData.description,
      discount_percentage: formData.discount_percentage,
      start_date: formData.start_date.toISOString(),
      end_date: formData.end_date.toISOString(),
      is_active: formData.is_active,
      car_types: formData.car_types.length > 0 ? formData.car_types : null,
    };

    if (editingCampaign) {
      const { error } = await supabase
        .from("campaigns")
        .update(campaignData)
        .eq("id", editingCampaign.id);

      if (error) {
        toast.error(t("admin.toast.updateError"));
        return;
      }
      toast.success(t("admin.toast.updateSuccess"));
    } else {
      const { error } = await supabase
        .from("campaigns")
        .insert(campaignData);

      if (error) {
        toast.error(t("admin.toast.createError"));
        return;
      }
      toast.success(t("admin.toast.createSuccess"));
    }

    setShowForm(false);
    setEditingCampaign(null);
    resetForm();
    fetchCampaigns();
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || "",
      discount_percentage: campaign.discount_percentage,
      start_date: new Date(campaign.start_date),
      end_date: new Date(campaign.end_date),
      is_active: campaign.is_active,
      car_types: campaign.car_types || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.deleteConfirm"))) return;

    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(t("admin.toast.deleteError"));
      return;
    }

    toast.success(t("admin.toast.deleteSuccess"));
    fetchCampaigns();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      discount_percentage: 10,
      start_date: new Date(),
      end_date: new Date(),
      is_active: true,
      car_types: [],
    });
  };

  const handleCarTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      car_types: prev.car_types.includes(type)
        ? prev.car_types.filter(t => t !== type)
        : [...prev.car_types, type]
    }));
  };

  if (loading) {
    return (
      <div className={`${mobilePageShell} bg-background`}>
        <Navbar />
        <div className={`${mobileTopInset} container mx-auto px-3 pb-12 text-center sm:px-4`}>
          <p className="text-xl text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className={`${mobilePageShell} bg-background`}>
      <Navbar />
      
      <main className={`${mobileTopInset} px-3 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] sm:px-4 md:pb-12`}>
        <div className="container mx-auto max-w-6xl min-w-0 fit-viewport">
          <div className="mb-6 flex items-center justify-between sm:mb-8">
            <div className="min-w-0">
              <h1 className="mb-1 text-2xl font-bold text-foreground sm:mb-2 sm:text-4xl">{t("admin.title")}</h1>
              <p className="text-sm text-muted-foreground sm:text-base">{t("admin.subtitle")}</p>
            </div>
          </div>

          <Tabs defaultValue="fleet" className="space-y-6 sm:space-y-8">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              <TabsTrigger value="fleet" className="gap-1.5 px-2 py-2 text-xs whitespace-nowrap sm:gap-2 sm:px-3 sm:text-sm">
                <Car className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                {t("admin.tabs.fleet")}
              </TabsTrigger>
              <TabsTrigger value="tracking" className="gap-1.5 px-2 py-2 text-xs whitespace-nowrap sm:gap-2 sm:px-3 sm:text-sm">
                <Navigation className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                {t("admin.tabs.tracking")}
              </TabsTrigger>
              <TabsTrigger value="regions" className="gap-1.5 px-2 py-2 text-xs whitespace-nowrap sm:gap-2 sm:px-3 sm:text-sm">
                <MapPinned className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                {t("admin.tabs.regions")}
              </TabsTrigger>
              <TabsTrigger value="rentals" className="gap-1.5 px-2 py-2 text-xs whitespace-nowrap sm:gap-2 sm:px-3 sm:text-sm">
                <ClipboardList className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                {t("admin.tabs.rentals")}
              </TabsTrigger>
              <TabsTrigger value="payouts" className="gap-1.5 px-2 py-2 text-xs whitespace-nowrap sm:gap-2 sm:px-3 sm:text-sm">
                <Wallet className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                {t("admin.tabs.payouts")}
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="gap-1.5 px-2 py-2 text-xs whitespace-nowrap sm:gap-2 sm:px-3 sm:text-sm">
                <Megaphone className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                {t("admin.tabs.campaigns")}
              </TabsTrigger>
              <TabsTrigger value="support" className="gap-1.5 px-2 py-2 text-xs whitespace-nowrap sm:gap-2 sm:px-3 sm:text-sm">
                <Headphones className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                {t("admin.tabs.support")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fleet">
              <AdminFleetSection />
            </TabsContent>

            <TabsContent value="tracking">
              <AdminGpsSection />
            </TabsContent>

            <TabsContent value="regions">
              <AdminRegionsSection />
            </TabsContent>

            <TabsContent value="rentals">
              <AdminRentalsSection />
            </TabsContent>

            <TabsContent value="payouts">
              <AdminPayoutsSection />
            </TabsContent>

            <TabsContent value="support">
              <AdminSupportSection />
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold sm:text-2xl">{t("admin.campaignsSection.title")}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t("admin.campaignsSection.subtitle")}
              </p>
            </div>
            <Button
              size="sm"
              className="h-9 shrink-0 self-start text-sm sm:h-10"
              onClick={() => {
              setShowForm(true);
              setEditingCampaign(null);
              resetForm();
            }}>
              <Plus className="mr-1.5 h-4 w-4 shrink-0" />
              {t("admin.newCampaign")}
            </Button>
          </div>

          {showForm && (
            <Card className="p-4 sm:p-6 mb-6">
              <h2 className="text-lg font-bold mb-4 sm:text-2xl sm:mb-6">
                {editingCampaign ? t("admin.editCampaign") : t("admin.createCampaign")}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div>
                  <Label>{t("admin.campaignName")}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>{t("admin.description")}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>{t("admin.discountPercent")}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{t("admin.startDate")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.start_date, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.start_date}
                          onSelect={(date) => date && setFormData({ ...formData, start_date: date })}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>{t("admin.endDate")}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.end_date, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.end_date}
                          onSelect={(date) => date && setFormData({ ...formData, end_date: date })}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block text-sm">{t("admin.carTypesLabel")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {["compact", "sedan", "suv"].map((type) => (
                      <Button
                        key={type}
                        type="button"
                        size="sm"
                        className="text-xs sm:text-sm"
                        variant={formData.car_types.includes(type) ? "default" : "outline"}
                        onClick={() => handleCarTypeToggle(type)}
                      >
                        {t(`admin.carTypes.${type}`)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label className="text-sm">{t("admin.active")}</Label>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="submit">
                    {editingCampaign ? t("admin.update") : t("admin.create")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingCampaign(null);
                      resetForm();
                    }}
                  >
                    {t("admin.cancel")}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="overflow-hidden">
                <div className="flex flex-col gap-4 p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-3">
                      <h3 className="text-lg font-bold leading-snug break-words sm:text-xl">
                        {campaign.name}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {campaign.is_active ? (
                          <Badge className="text-xs">{t("admin.active")}</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{t("admin.inactive")}</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {t("admin.discountBadge", { percent: campaign.discount_percentage })}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handleEdit(campaign)}
                        aria-label={t("admin.editCampaign")}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handleDelete(campaign.id)}
                        aria-label={t("admin.deleteConfirm")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {campaign.description && (
                    <p className="text-sm leading-relaxed text-muted-foreground break-words">
                      {campaign.description}
                    </p>
                  )}

                  <dl className="grid grid-cols-1 gap-3 border-t border-border/60 pt-4 text-sm sm:grid-cols-3">
                    <div className="min-w-0">
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("admin.startDate")}
                      </dt>
                      <dd className="mt-1 font-medium">
                        {format(new Date(campaign.start_date), "dd.MM.yyyy")}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("admin.endDate")}
                      </dt>
                      <dd className="mt-1 font-medium">
                        {format(new Date(campaign.end_date), "dd.MM.yyyy")}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("admin.carTypesLabel")}
                      </dt>
                      <dd className="mt-1 font-medium break-words">
                        {campaign.car_types?.length
                          ? campaign.car_types.map((type) => t(`admin.carTypes.${type}`)).join(", ")
                          : t("admin.allCarTypes")}
                      </dd>
                    </div>
                  </dl>
                </div>
              </Card>
            ))}
          </div>

          {campaigns.length === 0 && !showForm && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("admin.empty")}</p>
            </div>
          )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;

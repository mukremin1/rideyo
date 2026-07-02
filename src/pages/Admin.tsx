import { useState, useEffect } from "react";
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
import { Plus, Edit, Trash2, Calendar as CalendarIcon, Megaphone, Car, ClipboardList, Wallet, MapPinned } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminFleetSection from "@/components/AdminFleetSection";
import AdminRentalsSection from "@/components/AdminRentalsSection";
import AdminPayoutsSection from "@/components/AdminPayoutsSection";
import AdminRegionsSection from "@/components/AdminRegionsSection";

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
      navigate("/auth");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (error || !data) {
        toast.error(t("admin.noAccess"));
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 text-center">
          <p className="text-xl text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">{t("admin.title")}</h1>
              <p className="text-muted-foreground">{t("admin.subtitle")}</p>
            </div>
          </div>

          <Tabs defaultValue="fleet" className="space-y-6 sm:space-y-8">
            <TabsList className="flex h-auto w-full gap-1 overflow-x-auto p-1 sm:grid sm:grid-cols-6 sm:overflow-visible">
              <TabsTrigger value="fleet" className="min-w-[6.5rem] shrink-0 gap-2 px-3 py-2.5 text-sm whitespace-nowrap sm:min-w-0">
                <Car className="hidden h-4 w-4 shrink-0 sm:block" />
                {t("admin.tabs.fleet")}
              </TabsTrigger>
              <TabsTrigger value="regions" className="min-w-[6.5rem] shrink-0 gap-2 px-3 py-2.5 text-sm whitespace-nowrap sm:min-w-0">
                <MapPinned className="hidden h-4 w-4 shrink-0 sm:block" />
                {t("admin.tabs.regions")}
              </TabsTrigger>
              <TabsTrigger value="rentals" className="min-w-[6.5rem] shrink-0 gap-2 px-3 py-2.5 text-sm whitespace-nowrap sm:min-w-0">
                <ClipboardList className="hidden h-4 w-4 shrink-0 sm:block" />
                {t("admin.tabs.rentals")}
              </TabsTrigger>
              <TabsTrigger value="payouts" className="min-w-[6.5rem] shrink-0 gap-2 px-3 py-2.5 text-sm whitespace-nowrap sm:min-w-0">
                <Wallet className="hidden h-4 w-4 shrink-0 sm:block" />
                {t("admin.tabs.payouts")}
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="min-w-[6.5rem] shrink-0 gap-2 px-3 py-2.5 text-sm whitespace-nowrap sm:min-w-0">
                <Megaphone className="hidden h-4 w-4 shrink-0 sm:block" />
                {t("admin.tabs.campaigns")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fleet">
              <AdminFleetSection />
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

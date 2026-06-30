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
import { Plus, Edit, Trash2, Calendar as CalendarIcon, Megaphone, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminFleetSection from "@/components/AdminFleetSection";

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

          <Tabs defaultValue="fleet" className="space-y-8">
            <TabsList>
              <TabsTrigger value="fleet" className="gap-2">
                <Car className="w-4 h-4" />
                {t("admin.tabs.fleet")}
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="gap-2">
                <Megaphone className="w-4 h-4" />
                {t("admin.tabs.campaigns")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fleet">
              <AdminFleetSection />
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-8">
          <div className="flex justify-end">
            <Button onClick={() => {
              setShowForm(true);
              setEditingCampaign(null);
              resetForm();
            }}>
              <Plus className="w-4 h-4 mr-2" />
              {t("admin.newCampaign")}
            </Button>
          </div>

          {showForm && (
            <Card className="p-6 mb-8">
              <h2 className="text-2xl font-bold mb-6">
                {editingCampaign ? t("admin.editCampaign") : t("admin.createCampaign")}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
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

                <div className="grid grid-cols-2 gap-4">
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
                  <Label className="mb-3 block">{t("admin.carTypesLabel")}</Label>
                  <div className="flex gap-2">
                    {["compact", "sedan", "suv"].map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={formData.car_types.includes(type) ? "default" : "outline"}
                        onClick={() => handleCarTypeToggle(type)}
                      >
                        {t(`admin.carTypes.${type}`)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>{t("admin.active")}</Label>
                </div>

                <div className="flex gap-2">
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
              <Card key={campaign.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold">{campaign.name}</h3>
                      {campaign.is_active ? (
                        <Badge>{t("admin.active")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("admin.inactive")}</Badge>
                      )}
                      <Badge variant="outline">{t("admin.discountBadge", { percent: campaign.discount_percentage })}</Badge>
                    </div>
                    <p className="text-muted-foreground mb-3">{campaign.description}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{t("admin.startLabel")} {format(new Date(campaign.start_date), "dd/MM/yyyy")}</span>
                      <span>{t("admin.endLabel")} {format(new Date(campaign.end_date), "dd/MM/yyyy")}</span>
                      {campaign.car_types && (
                        <span>{t("admin.carsLabel")} {campaign.car_types.join(", ")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(campaign)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(campaign.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
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

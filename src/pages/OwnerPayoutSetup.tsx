import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/serverApi";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type PayoutProfile = {
  id: string;
  status: string;
  iban: string;
  contact_name: string;
  contact_surname: string;
  sub_merchant_key: string | null;
};

const OwnerPayoutSetup = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<PayoutProfile | null>(null);
  const [form, setForm] = useState({
    contactName: "",
    contactSurname: "",
    email: "",
    gsmNumber: "",
    identityNumber: "",
    iban: "",
    address: "",
    taxOffice: "",
    legalCompanyTitle: "",
  });

  useEffect(() => {
    if (!authLoading && user) {
      void loadProfile();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("owner_payout_profiles")
      .select("id, status, iban, contact_name, contact_surname, sub_merchant_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
      setForm((prev) => ({
        ...prev,
        contactName: data.contact_name,
        contactSurname: data.contact_surname,
        iban: data.iban,
      }));
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Oturum bulunamadı");
      }

      const { data, error } = await invokeEdgeFunction(
        "register-submerchant",
        form,
        session.access_token,
        (name, options) =>
          supabase.functions.invoke(name, options).then((r) => ({
            data: r.data as Record<string, unknown> | null,
            error: r.error,
          })),
      );

      if (error || !data?.success) {
        throw new Error((data?.error as string) || error?.message || "Kayıt başarısız");
      }

      toast.success("Ödeme profiliniz kaydedildi");
      await loadProfile();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12 max-w-lg text-center">
          <p className="text-muted-foreground">Giriş yapmanız gerekiyor.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const isActive = profile?.status === "active";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wallet className="w-8 h-8 text-primary" />
            Ödeme & Hakediş Ayarları
          </h1>
          <p className="text-muted-foreground mt-2">
            Kiralama gelirlerinizin banka hesabınıza aktarılması için bilgilerinizi tamamlayın.
          </p>
        </div>

        {isActive && profile && (
          <Card className="mb-6 border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="pt-6 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold">Ödeme profiliniz aktif</p>
                <p className="text-sm text-muted-foreground mt-1">
                  IBAN: {profile.iban.replace(/(.{4})/g, "$1 ").trim()}
                </p>
                <Badge className="mt-2" variant="secondary">iyzico Marketplace</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {!isActive && (
          <Card className="mb-6 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Profilinizi tamamlamadan araç kiralama gelirleri hesabınıza aktarılamaz.
                Platform komisyonu kesildikten sonra kalan tutar IBAN&apos;ınıza yatırılır.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{isActive ? "Bilgileri Güncelle" : "Hakediş Bilgileri"}</CardTitle>
            <CardDescription>
              Gerçek ad, TC kimlik ve IBAN bilgileriniz iyzico alt üye işyeri kaydı için kullanılır.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Ad</Label>
                  <Input
                    id="contactName"
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactSurname">Soyad</Label>
                  <Input
                    id="contactSurname"
                    value={form.contactSurname}
                    onChange={(e) => setForm({ ...form, contactSurname: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gsmNumber">Telefon</Label>
                <Input
                  id="gsmNumber"
                  placeholder="5XX XXX XX XX"
                  value={form.gsmNumber}
                  onChange={(e) => setForm({ ...form, gsmNumber: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="identityNumber">TC Kimlik No</Label>
                <Input
                  id="identityNumber"
                  maxLength={11}
                  value={form.identityNumber}
                  onChange={(e) => setForm({ ...form, identityNumber: e.target.value.replace(/\D/g, "") })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  placeholder="TR..."
                  value={form.iban}
                  onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxOffice">Vergi Dairesi (opsiyonel)</Label>
                  <Input
                    id="taxOffice"
                    value={form.taxOffice}
                    onChange={(e) => setForm({ ...form, taxOffice: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalCompanyTitle">Unvan (opsiyonel)</Label>
                  <Input
                    id="legalCompanyTitle"
                    value={form.legalCompanyTitle}
                    onChange={(e) => setForm({ ...form, legalCompanyTitle: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Kaydediliyor...
                  </span>
                ) : (
                  isActive ? "Güncelle" : "Kaydet ve Aktifleştir"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default OwnerPayoutSetup;

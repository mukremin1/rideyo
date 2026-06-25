import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Heart, LogOut, Mail, Package, Phone, ShieldCheck, UserRound } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { displayDriverScore } from "@/lib/driverScore";

interface ActiveSubscription {
  tier: "basic" | "premium" | "vip";
  end_date: string;
  status: string;
}

interface DriverRecord {
  national_id?: string | null;
  verified_surname?: string | null;
  verified_given_names?: string | null;
  driver_score?: number | null;
  verification_status?: string | null;
}

const tierLabel: Record<ActiveSubscription["tier"], string> = {
  basic: "Temel",
  premium: "Premium",
  vip: "VIP",
};

export default function Profile() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscription | null>(null);
  const [driverRecord, setDriverRecord] = useState<DriverRecord | null>(null);

  const fetchActiveSubscription = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("tier, end_date, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("end_date", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setActiveSubscription(data ?? null);
    } catch (error: unknown) {
      toast.error("Abonelik bilgileri alınamadı.");
      console.error("Profile subscription fetch error:", error);
    }
  }, [user]);

  const fetchDriverRecord = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("driver_history")
      .select("national_id, verified_surname, verified_given_names, driver_score, verification_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      // Migration uygulanmamış olabilir — temel alanlarla tekrar dene
      const { data: fallback } = await supabase
        .from("driver_history")
        .select("driver_score, verification_status")
        .eq("user_id", user.id)
        .maybeSingle();

      setDriverRecord(
        fallback
          ? {
              ...fallback,
              national_id: (user.user_metadata?.national_id as string | undefined) ?? null,
            }
          : null,
      );
      return;
    }

    setDriverRecord(data ?? null);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      void fetchActiveSubscription();
      void fetchDriverRecord();
    }
  }, [fetchActiveSubscription, fetchDriverRecord, loading, navigate, user]);

  const isIdentityVerified = Boolean(
    (user?.user_metadata?.nfc_verified_at || user?.user_metadata?.nfc_verified) &&
      (user?.user_metadata?.liveness_verified_at || user?.user_metadata?.liveness_verified),
  );

  const maskedNationalId = (id?: string | null): string => {
    if (!id || id.length < 6) return "***";
    return id.slice(0, 3) + "•".repeat(Math.max(0, id.length - 6)) + id.slice(-3);
  };

  const verifiedAt = user?.user_metadata?.nfc_verified_at
    ? new Date(user.user_metadata.nfc_verified_at as string).toLocaleDateString("tr-TR")
    : null;

  const displayName = useMemo(() => {
    const firstName = String(user?.user_metadata?.first_name ?? "").trim();
    const lastName = String(user?.user_metadata?.last_name ?? "").trim();
    const fullNameMeta = String(user?.user_metadata?.full_name ?? "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    return fullName || fullNameMeta || "Üye";
  }, [user?.user_metadata]);

  const phone = useMemo(() => {
    const raw = user?.phone ?? user?.user_metadata?.phone;
    return raw ? String(raw) : "Belirtilmedi";
  }, [user?.phone, user?.user_metadata?.phone]);

  const joinedAt = useMemo(() => {
    if (!user?.created_at) return "-";
    return new Date(user.created_at).toLocaleDateString("tr-TR");
  }, [user?.created_at]);

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-24 md:pb-12">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" />
                Üye Bilgileri
              </CardTitle>
              <CardDescription>Hesabınıza ait temel bilgiler.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">Ad Soyad</div>
                <div className="font-medium text-right">{displayName}</div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-posta
                </div>
                <div className="font-medium text-right break-all">{user.email ?? "-"}</div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefon
                </div>
                <div className="font-medium text-right">{phone}</div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Üyelik Tarihi
                </div>
                <div className="font-medium text-right">{joinedAt}</div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">Sürücü Puanı</div>
                <div className={`font-bold ${displayDriverScore(driverRecord?.driver_score) >= 80 ? "text-green-500" : displayDriverScore(driverRecord?.driver_score) >= 60 ? "text-yellow-500" : "text-red-500"}`}>
                  {displayDriverScore(driverRecord?.driver_score)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Kimlik Doğrulama
              </CardTitle>
              <CardDescription>Güvenli kiralama için kimlik doğrulama durumunuz.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant={isIdentityVerified ? "default" : "secondary"}>
                  {isIdentityVerified ? "Doğrulandı ✓" : "Henüz doğrulanmadı"}
                </Badge>
                {isIdentityVerified && verifiedAt && (
                  <span className="text-xs text-muted-foreground">{verifiedAt}</span>
                )}
              </div>

              {isIdentityVerified && (driverRecord?.national_id || driverRecord?.verified_surname) && (
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                  {driverRecord.verified_surname && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kart Sahibi</span>
                      <span className="font-medium">
                        {driverRecord.verified_surname} {driverRecord.verified_given_names ?? ""}
                      </span>
                    </div>
                  )}
                  {driverRecord.national_id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TC Kimlik No</span>
                      <span className="font-mono font-medium">{maskedNationalId(driverRecord.national_id)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant={isIdentityVerified ? "outline" : "default"}
                  onClick={() => navigate("/identity-verification")}
                >
                  {isIdentityVerified ? "Yeniden Doğrula" : "Kimlik Doğrula"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Paketler
              </CardTitle>
              <CardDescription>Abonelik paketlerinizi ayrı sayfadan yönetebilirsiniz.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {activeSubscription
                  ? `Aktif paket: ${tierLabel[activeSubscription.tier]} (Bitiş: ${new Date(activeSubscription.end_date).toLocaleDateString("tr-TR")})`
                  : "Aktif paketiniz bulunmuyor."}
              </div>
              <Button type="button" onClick={() => navigate("/packages")}>
                Paketleri Gör
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hızlı İşlemler</CardTitle>
              <CardDescription>Sık kullanılan sayfalara tek dokunuşla geçin.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button type="button" variant="outline" onClick={() => navigate("/my-bookings")}>
                Rezervasyonlarım
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/favorites")}>
                <Heart className="h-4 w-4 mr-2" />
                Favorilerim
              </Button>
              <Button type="button" variant="destructive" onClick={() => void signOut()}>
                <LogOut className="h-4 w-4 mr-2" />
                Çıkış Yap
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}


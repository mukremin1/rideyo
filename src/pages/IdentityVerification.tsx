import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AutoLicenseVerification from "@/components/AutoLicenseVerification";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isIdentityFullyVerified, markIdentityVerifiedLocal } from "@/lib/identityVerification";

export default function IdentityVerification() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [reVerify, setReVerify] = useState(false);
  const [licenseApproved, setLicenseApproved] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    if (!user) {
      setLicenseApproved(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("driver_history")
        .select("is_approved, license_number")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setLicenseApproved(Boolean(data?.is_approved && data?.license_number));
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const identityDone = isIdentityFullyVerified(user?.user_metadata as Record<string, unknown> | undefined);
  const isAlreadyVerified = identityDone && licenseApproved === true;

  const verifiedAt = user?.user_metadata?.nfc_verified_at
    ? new Date(user.user_metadata.nfc_verified_at as string).toLocaleDateString("tr-TR")
    : null;

  const handleVerified = async (isApproved: boolean, riskLevel: string, nationalId?: string) => {
    if (!user) return;
    if (!isApproved) {
      toast.error("Doğrulama tamamlanmadı. Lütfen adımları tekrar deneyin.");
      return;
    }

    try {
      setSaving(true);
      const now = new Date().toISOString();
      const updatedData: Record<string, unknown> = {
        ...(user.user_metadata ?? {}),
        nfc_verified_at: now,
        nfc_verified: true,
        liveness_verified_at: now,
        liveness_verified: true,
        driver_risk_level: riskLevel,
      };
      if (nationalId) updatedData.national_id = nationalId;

      const { error } = await supabase.auth.updateUser({ data: updatedData });
      if (error) {
        toast.error(error.message ?? "Doğrulama durumu kaydedilemedi.");
        return;
      }

      markIdentityVerifiedLocal(user.id);
      setLicenseApproved(true);
      navigate("/profile");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-3xl space-y-4">

          {isAlreadyVerified && !reVerify ? (
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-lg">Kimliğiniz Doğrulandı</p>
                  {verifiedAt && (
                    <p className="text-sm text-muted-foreground">Doğrulama tarihi: {verifiedAt}</p>
                  )}
                </div>
                <Badge className="ml-auto bg-green-500">Aktif</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Kimlik, canlılık ve ehliyet doğrulamanız tamamlandı. Araç kiralama hizmetinden yararlanabilirsiniz.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => navigate("/profile")} className="flex-1">
                  Profile Dön
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setReVerify(true)}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Yeniden Doğrula
                </Button>
              </div>
            </Card>
          ) : (
            <>
              <Card className="p-5 text-sm text-muted-foreground">
                {reVerify
                  ? "Kimliğinizi yeniden doğruluyorsunuz. Yeni kart bilgileri mevcut kaydın üzerine yazılacaktır."
                  : identityDone && licenseApproved === false
                    ? "Kimlik ve canlılık tamamlandı. Ehliyet numaranızı girerek doğrulamayı bitirin."
                    : "Sırayla kimlik kartı NFC, canlılık kontrolü ve ehliyet numarası adımlarını tamamlayın."}
                {saving ? " Kaydediliyor..." : ""}
              </Card>
              <AutoLicenseVerification userId={user.id} onVerified={handleVerified} />
            </>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}

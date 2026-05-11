import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AutoLicenseVerification from "@/components/AutoLicenseVerification";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function IdentityVerification() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, navigate, user]);

  const handleVerified = async (isApproved: boolean) => {
    if (!user) return;
    if (!isApproved) {
      toast.error("Doğrulama tamamlanmadı. Lütfen adımları tekrar deneyin.");
      return;
    }

    try {
      setSaving(true);
      const now = new Date().toISOString();
      const updatedData = {
        ...(user.user_metadata ?? {}),
        nfc_verified_at: now,
        nfc_verified: true,
        liveness_verified_at: now,
        liveness_verified: true,
      };

      const { error } = await supabase.auth.updateUser({ data: updatedData });
      if (error) {
        toast.error(error.message ?? "Doğrulama durumu kaydedilemedi.");
        return;
      }

      localStorage.setItem(`nfc_verified_${user.id}`, "true");
      toast.success("NFC kimlik doğrulaması tamamlandı.");
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
          <Card className="p-5 text-sm text-muted-foreground">
            NFC ve canlılık adımını tamamlayıp ehliyet doğrulamasını gönderin.
            {saving ? " Kaydediliyor..." : ""}
          </Card>
          <AutoLicenseVerification userId={user.id} onVerified={handleVerified} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

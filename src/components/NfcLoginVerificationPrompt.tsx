import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { Shield, SmartphoneNfc } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

const NfcLoginVerificationPrompt = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dismissedForSession, setDismissedForSession] = useState(false);

  const isNativeMobile = useMemo(() => {
    return Capacitor.isNativePlatform() && ["android", "ios"].includes(Capacitor.getPlatform());
  }, []);

  const verifiedKey = useMemo(() => {
    if (!user?.id) return "";
    return `nfc_verified_${user.id}`;
  }, [user?.id]);

  useEffect(() => {
    if (!isNativeMobile || loading || !user || !verifiedKey) {
      setOpen(false);
      return;
    }

    const isServerVerified = Boolean(
      (user.user_metadata?.nfc_verified_at || user.user_metadata?.nfc_verified) &&
        (user.user_metadata?.liveness_verified_at || user.user_metadata?.liveness_verified),
    );

    if (isServerVerified) {
      localStorage.setItem(verifiedKey, "true");
    } else {
      localStorage.removeItem(verifiedKey);
    }

    const isVerified = isServerVerified || localStorage.getItem(verifiedKey) === "true";
    if (isVerified) {
      setOpen(false);
      return;
    }

    setOpen(!dismissedForSession);
  }, [dismissedForSession, isNativeMobile, loading, user, verifiedKey]);

  useEffect(() => {
    if (!isNativeMobile) return;

    const handleActive = () => {
      if (document.visibilityState === "visible") {
        setDismissedForSession(false);
      }
    };

    document.addEventListener("visibilitychange", handleActive);
    window.addEventListener("focus", handleActive);

    return () => {
      document.removeEventListener("visibilitychange", handleActive);
      window.removeEventListener("focus", handleActive);
    };
  }, [isNativeMobile]);

  const remindLater = () => {
    setDismissedForSession(true);
    setOpen(false);
    toast.message("NFC doğrulama bu oturum için ertelendi. Uygulamaya tekrar girince yeniden gösterilecek.");
  };

  const goToVerificationPage = () => {
    setDismissedForSession(true);
    setOpen(false);
    navigate("/identity-verification");
  };

  if (!isNativeMobile || !user) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          toast.message("Lütfen bir seçim yapın: Daha Sonra Hatırlat veya Şimdi Doğrula.");
          return;
        }
        setOpen(nextOpen);
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            NFC Kimlik Doğrulaması
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            Güvenli kiralama için giriş sonrası NFC ile kimlik doğrulaması gereklidir.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <SmartphoneNfc className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>Şimdi Doğrula ile NFC doğrulama sayfasına yönlendirilirsiniz.</p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-row sm:justify-between sm:gap-4">
          <Button type="button" variant="outline" onClick={remindLater} className="w-full sm:w-auto">
            Daha Sonra Hatırlat
          </Button>
          <Button type="button" onClick={goToVerificationPage} className="w-full sm:w-auto">
            Şimdi Doğrula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NfcLoginVerificationPrompt;

import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useLocation } from "react-router-dom";
import { Shield, SmartphoneNfc, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

const REMIND_DELAY_MS = 24 * 60 * 60 * 1000;

const NfcLoginVerificationPrompt = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);

  const isNativeMobile = useMemo(() => {
    return Capacitor.isNativePlatform() && ["android", "ios"].includes(Capacitor.getPlatform());
  }, []);

  const verifiedKey = useMemo(() => {
    if (!user?.id) return "";
    return `nfc_verified_${user.id}`;
  }, [user?.id]);

  const remindKey = useMemo(() => {
    if (!user?.id) return "";
    return `nfc_remind_at_${user.id}`;
  }, [user?.id]);

  useEffect(() => {
    if (!isNativeMobile || loading || !user || !verifiedKey || !remindKey) {
      setOpen(false);
      return;
    }

    if (location.pathname === "/auth") {
      setOpen(false);
      return;
    }

    const isServerVerified = Boolean(user.user_metadata?.nfc_verified_at);
    if (isServerVerified) {
      localStorage.setItem(verifiedKey, "true");
    }

    const isVerified = isServerVerified || localStorage.getItem(verifiedKey) === "true";
    if (isVerified) {
      setOpen(false);
      return;
    }

    const remindAtRaw = localStorage.getItem(remindKey);
    const remindAt = remindAtRaw ? Number(remindAtRaw) : 0;
    setOpen(Number.isFinite(remindAt) ? Date.now() >= remindAt : true);
  }, [isNativeMobile, loading, location.pathname, remindKey, user, verifiedKey]);

  const persistVerifiedState = async () => {
    if (!user) return false;

    const updatedData = {
      ...(user.user_metadata ?? {}),
      nfc_verified_at: new Date().toISOString(),
      nfc_verified: true,
    };

    const { error } = await supabase.auth.updateUser({ data: updatedData });
    if (error) {
      toast.error(error.message ?? "NFC dogrulama kaydi sunucuya yazilamadi.");
      return false;
    }

    return true;
  };

  const markVerified = async () => {
    const persisted = await persistVerifiedState();
    if (!persisted) return;

    if (!verifiedKey || !remindKey) return;
    localStorage.setItem(verifiedKey, "true");
    localStorage.removeItem(remindKey);
    setOpen(false);
    toast.success("NFC kimlik dogrulamasi tamamlandi.");
  };

  const remindLater = () => {
    if (!remindKey) return;
    localStorage.setItem(remindKey, String(Date.now() + REMIND_DELAY_MS));
    setOpen(false);
    toast.message("NFC dogrulama hatirlatmasi 24 saat sonra tekrar gosterilecek.");
  };

  const handleVerify = async () => {
    const ReaderCtor = (window as any).NDEFReader;
    if (!ReaderCtor) {
      toast.error("Bu cihazda NFC tarama desteklenmiyor.");
      return;
    }

    try {
      setScanning(true);
      const reader = new ReaderCtor();
      await reader.scan();
      toast.message("Kimliginizi telefona yaklastirin.");

      const timeoutId = window.setTimeout(() => {
        setScanning(false);
        toast.error("NFC okuma zaman asimina ugradi. Tekrar deneyin.");
      }, 20000);

      reader.onreading = () => {
        window.clearTimeout(timeoutId);
        setScanning(false);
        void markVerified();
      };

      reader.onreadingerror = () => {
        window.clearTimeout(timeoutId);
        setScanning(false);
        toast.error("NFC okunamadi. Kimligi tekrar yaklastirin.");
      };
    } catch (error: any) {
      setScanning(false);
      toast.error(error?.message ?? "NFC dogrulama baslatilamadi.");
    }
  };

  if (!isNativeMobile || !user) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !scanning) {
          remindLater();
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
            NFC Kimlik Dogrulamasi
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            Guvenli kiralama icin giris sonrasi NFC ile kimlik dogrulamasi gereklidir.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <SmartphoneNfc className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>Dogrula secenegine bastiktan sonra kimliginizi telefonunuza yaklastirin.</p>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" onClick={remindLater} disabled={scanning}>
            Daha Sonra Hatirlat
          </Button>
          <Button type="button" onClick={handleVerify} disabled={scanning}>
            {scanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Taranıyor
              </>
            ) : (
              "Dogrula"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NfcLoginVerificationPrompt;

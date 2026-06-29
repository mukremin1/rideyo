import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Shield, SmartphoneNfc } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import {
  isIdentityVerifiedLocally,
  isNfcVerified,
  markIdentityVerifiedLocal,
} from "@/lib/identityVerification";

const NfcLoginVerificationPrompt = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [dismissedForSession, setDismissedForSession] = useState(false);

  const isNativeMobile = useMemo(() => {
    return Capacitor.isNativePlatform() && ["android", "ios"].includes(Capacitor.getPlatform());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkVerification = async () => {
      if (!isNativeMobile || loading || !user?.id) {
        setOpen(false);
        return;
      }

      const { data: { user: freshUser } } = await supabase.auth.getUser();
      const metadata = (freshUser?.user_metadata ?? user.user_metadata) as Record<string, unknown> | undefined;
      const nfcDone = isNfcVerified(metadata) || isIdentityVerifiedLocally(user.id);

      if (nfcDone) {
        markIdentityVerifiedLocal(user.id);
        if (!cancelled) setOpen(false);
        return;
      }

      if (!cancelled) {
        setOpen(!dismissedForSession);
      }
    };

    void checkVerification();
    return () => {
      cancelled = true;
    };
  }, [dismissedForSession, isNativeMobile, loading, user, user?.id, user?.user_metadata]);

  const remindLater = () => {
    setDismissedForSession(true);
    setOpen(false);
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
        if (!nextOpen) return;
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
            {t("verification.nfcPrompt.title")}
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            {t("verification.nfcPrompt.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <SmartphoneNfc className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>{t("verification.nfcPrompt.hint")}</p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-row sm:justify-between sm:gap-4">
          <Button type="button" variant="outline" onClick={remindLater} className="w-full sm:w-auto">
            {t("verification.nfcPrompt.remindLater")}
          </Button>
          <Button type="button" onClick={goToVerificationPage} className="w-full sm:w-auto">
            {t("verification.nfcPrompt.verifyNow")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NfcLoginVerificationPrompt;

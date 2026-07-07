import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { toast } from "sonner";
import { isNativeMobile } from "@/lib/platform";
import { completeOAuthFromUrl } from "@/lib/socialAuth";
import { isPkceVerifierError } from "@/lib/authCallback";

/** Completes Google/Apple OAuth when the native app receives rideyo://auth/callback */
const OAuthDeepLinkHandler = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const handling = useRef(false);

  useEffect(() => {
    if (!isNativeMobile()) return;

    const handleUrl = async (url: string) => {
      if (!url.includes("auth/callback") || handling.current) return;
      handling.current = true;

      try {
        await Browser.close().catch(() => undefined);
        const session = await completeOAuthFromUrl(url);
        if (session) {
          toast.success(t("auth.toast.signInSuccess"));
          navigate("/", { replace: true });
        } else {
          toast.error(t("auth.toast.genericError"));
          navigate("/auth", { replace: true });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : t("auth.toast.genericError");
        if (isPkceVerifierError(message)) {
          toast.error(t("auth.toast.oauthPkceError"));
        } else {
          toast.error(message);
        }
        navigate("/auth", { replace: true });
      } finally {
        handling.current = false;
      }
    };

    void App.getLaunchUrl().then((result) => {
      if (result?.url) void handleUrl(result.url);
    });

    const listener = App.addListener("appUrlOpen", ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [navigate, t]);

  return null;
};

export default OAuthDeepLinkHandler;

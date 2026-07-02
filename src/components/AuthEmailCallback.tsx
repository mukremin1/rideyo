import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  hasAuthCallbackParams,
  isPkceVerifierError,
  parseAuthCallbackParams,
} from "@/lib/authCallback";

/** Completes email verification / password-reset callbacks from mail links. */
const AuthEmailCallback = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const handled = useRef(false);
  const showSpinner = window.location.pathname.startsWith("/auth/callback");

  useEffect(() => {
    if (handled.current || !hasAuthCallbackParams()) return;
    handled.current = true;

    const complete = async () => {
      const params = parseAuthCallbackParams();
      const isRecovery = params.type === "recovery";
      const isSignup = params.type === "signup" || params.type === "email";

      if (params.error) {
        toast.error(params.error);
        navigate("/auth", { replace: true });
        return;
      }

      if (params.token_hash && params.type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: params.token_hash,
          type: params.type,
        });
        if (error) {
          toast.error(error.message);
          navigate(isRecovery ? "/auth?forgot=1" : "/auth", { replace: true });
          return;
        }
      } else if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error) {
          if (isPkceVerifierError(error.message)) {
            toast.error(t("auth.toast.resetLinkPkceError"));
            navigate("/auth?forgot=1", { replace: true });
          } else {
            toast.error(error.message);
            navigate("/auth", { replace: true });
          }
          return;
        }
      } else {
        const { error } = await supabase.auth.getSession();
        if (error) {
          toast.error(error.message);
          navigate("/auth", { replace: true });
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (session && isRecovery) {
        navigate("/auth?reset=1", { replace: true });
        return;
      }

      if (session && isSignup) {
        await supabase.auth.signOut();
        navigate("/auth?verified=1", { replace: true });
        return;
      }

      if (session) {
        navigate("/", { replace: true });
        return;
      }

      navigate("/auth", { replace: true });
    };

    void complete();
  }, [navigate, t]);

  if (!showSpinner || !hasAuthCallbackParams()) return null;

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-muted-foreground">
      {t("auth.emailCallback.processing", "E-posta doğrulanıyor…")}
    </div>
  );
};

export default AuthEmailCallback;

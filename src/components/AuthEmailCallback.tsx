import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function hasAuthCallbackParams(): boolean {
  const hash = window.location.hash;
  const search = window.location.search;
  return (
    hash.includes("access_token=") ||
    hash.includes("type=signup") ||
    hash.includes("type=recovery") ||
    search.includes("code=") ||
    search.includes("token_hash=")
  );
}

function isEmailVerificationCallback(): boolean {
  const hash = window.location.hash;
  if (hash.includes("type=signup")) return true;
  if (hash.includes("type=recovery")) return false;
  if (hash.includes("type=magiclink")) return false;
  return window.location.search.includes("code=") || window.location.search.includes("token_hash=");
}

function isPasswordRecoveryCallback(): boolean {
  const hash = window.location.hash;
  const search = window.location.search;
  return hash.includes("type=recovery") || search.includes("type=recovery");
}

/** Completes email verification / magic-link callbacks and cleans the URL. */
const AuthEmailCallback = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const handled = useRef(false);
  const showSpinner = window.location.pathname.startsWith("/auth/callback");

  useEffect(() => {
    if (handled.current || !hasAuthCallbackParams()) return;
    handled.current = true;

    const complete = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast.error(error.message);
          navigate("/auth", { replace: true });
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
      if (session && isPasswordRecoveryCallback()) {
        navigate("/auth?reset=1", { replace: true });
        return;
      }

      if (session && isEmailVerificationCallback()) {
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

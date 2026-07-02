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

/** Completes email verification / magic-link callbacks and cleans the URL. */
const AuthEmailCallback = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const handled = useRef(false);

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
          return;
        }
      } else {
        const { error } = await supabase.auth.getSession();
        if (error) {
          toast.error(error.message);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        toast.success(t("auth.toast.emailConfirmed"));
        navigate("/", { replace: true });
      }

      const cleanPath = window.location.pathname || "/";
      window.history.replaceState({}, document.title, cleanPath);
    };

    void complete();
  }, [navigate, t]);

  return null;
};

export default AuthEmailCallback;

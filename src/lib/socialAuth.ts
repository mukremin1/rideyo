import { Browser } from "@capacitor/browser";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getAuthRedirectUrl } from "@/lib/authRedirect";
import { isNativeMobile } from "@/lib/platform";

export type OAuthProvider = "google" | "apple";
export type OAuthUserType = "renter" | "car_owner";

const PENDING_OAUTH_KEY = "rideyo_oauth_pending";

export type PendingOAuthMeta = {
  userType: OAuthUserType;
  mode: "signin" | "signup";
};

export function stashPendingOAuth(meta: PendingOAuthMeta): void {
  sessionStorage.setItem(PENDING_OAUTH_KEY, JSON.stringify(meta));
}

export function peekPendingOAuth(): PendingOAuthMeta | null {
  const raw = sessionStorage.getItem(PENDING_OAUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingOAuthMeta;
  } catch {
    return null;
  }
}

export function consumePendingOAuth(): PendingOAuthMeta | null {
  const pending = peekPendingOAuth();
  sessionStorage.removeItem(PENDING_OAUTH_KEY);
  return pending;
}

export function getOAuthRedirectUrl(): string {
  if (isNativeMobile()) {
    return "rideyo://auth/callback";
  }
  return getAuthRedirectUrl("/auth/callback");
}

export async function startSocialSignIn(
  provider: OAuthProvider,
  meta: PendingOAuthMeta = { mode: "signin", userType: "renter" },
): Promise<void> {
  if (!isNativeMobile()) {
    throw new Error("Social sign-in is only available in the mobile app");
  }

  stashPendingOAuth(meta);

  const redirectTo = getOAuthRedirectUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams:
        provider === "google"
          ? { access_type: "online", prompt: "select_account" }
          : undefined,
      scopes: provider === "apple" ? "name email" : undefined,
    },
  });

  if (error) throw error;

  if (data?.url) {
    await Browser.open({ url: data.url, presentationStyle: "popover" });
  }
}

export async function completeOAuthFromUrl(url: string): Promise<Session | null> {
  const parsed = new URL(url);
  const error =
    parsed.searchParams.get("error_description") ?? parsed.searchParams.get("error");
  if (error) {
    throw new Error(error);
  }

  const code = parsed.searchParams.get("code");
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  if (session) {
    await applyPendingOAuthProfile(session);
  }

  return session;
}

export async function applyPendingOAuthProfile(session: Session): Promise<void> {
  const pending = consumePendingOAuth();
  if (!pending || pending.mode !== "signup") return;

  const meta = session.user.user_metadata ?? {};
  const displayName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    "";

  const profileUpdates: Record<string, string> = { user_type: pending.userType };
  if (displayName) {
    profileUpdates.full_name = displayName;
  }

  await supabase.auth.updateUser({ data: profileUpdates });

  if (pending.userType === "car_owner") {
    const { error } = await supabase.rpc("apply_oauth_signup_role", {
      p_user_type: "car_owner",
    });
    if (error) {
      console.error("OAuth car_owner role:", error);
    }
  }
}

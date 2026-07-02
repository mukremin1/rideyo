const DEFAULT_SITE_URL = "https://www.ride-yo.com";
const AUTH_CALLBACK_PATH = "/auth/callback";

function isLocalHost(url: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
}

/** Redirect URL for Supabase email confirmation and password reset links. */
export function getAuthRedirectUrl(path = AUTH_CALLBACK_PATH): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const envSite =
    typeof import.meta.env.VITE_SITE_URL === "string"
      ? import.meta.env.VITE_SITE_URL.trim().replace(/\/$/, "")
      : "";

  const base = envSite && !isLocalHost(envSite) ? envSite : DEFAULT_SITE_URL;
  return `${base}${normalizedPath}`;
}

/** Map Supabase auth errors to user-friendly Turkish messages. */
export function getAuthErrorMessage(error: { message: string }, t: (key: string) => string): string {
  const msg = error.message.toLowerCase();

  if (msg.includes("already registered") || msg.includes("already been registered")) {
    return t("auth.toast.emailAlreadyRegistered");
  }
  if (msg.includes("email not confirmed")) {
    return t("auth.toast.emailNotConfirmed");
  }
  if (msg.includes("invalid login credentials")) {
    return t("auth.toast.invalidCredentials");
  }
  if (msg.includes("redirect") || msg.includes("invalid url")) {
    return t("auth.toast.redirectNotAllowed");
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return t("auth.toast.emailRateLimit");
  }
  if (msg.includes("already confirmed") || msg.includes("email address has already been verified")) {
    return t("auth.toast.emailAlreadyConfirmed");
  }

  return error.message;
}

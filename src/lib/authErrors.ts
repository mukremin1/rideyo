import type { TFunction } from "i18next";

/** Map Supabase Auth errors to user-facing messages. */
export function getAuthErrorMessage(error: { message: string }, t: TFunction): string {
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
  if (msg.includes("redirect") && msg.includes("not allowed")) {
    return t("auth.toast.redirectNotAllowed");
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return t("auth.toast.emailRateLimit");
  }
  if (msg.includes("signup") && msg.includes("disabled")) {
    return t("auth.toast.signUpDisabled");
  }
  if (msg.includes("invalid email")) {
    return t("auth.validation.emailInvalid");
  }

  return error.message || t("auth.toast.genericError");
}

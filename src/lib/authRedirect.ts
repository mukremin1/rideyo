/** Redirect URL for Supabase email confirmation and password reset links. */
export function getAuthRedirectUrl(path = "/"): string {
  const base = window.location.origin.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/** Platform operators with full fleet / admin access. */
export const ADMIN_EMAILS = ["mukremin.cakmak.da@gmail.com"] as const;

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === normalized);
}

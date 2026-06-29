import i18n from "@/i18n";

/** Canonical booking payment statuses (matches DB constraint) */
export const PAYMENT_STATUS = {
  PENDING: "pending",
  AUTHORIZED: "authorized",
  COMPLETED: "completed",
  IN_PROGRESS: "in_progress",
  FAILED: "failed",
  REFUNDED: "refunded",
  CANCELLED: "cancelled",
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/** Booking is paid and rental can start */
export function isBookingPaid(status: string | null | undefined): boolean {
  return (
    status === PAYMENT_STATUS.COMPLETED ||
    status === PAYMENT_STATUS.IN_PROGRESS ||
    status === "paid" // legacy
  );
}

/** Booking is active rental */
export function isRentalActive(status: string | null | undefined): boolean {
  return status === PAYMENT_STATUS.IN_PROGRESS;
}

export function paymentStatusLabel(status: string | null | undefined): string {
  const normalized = status === "paid" ? "completed" : status;
  const known = ["pending", "authorized", "completed", "in_progress", "failed", "refunded", "cancelled"];
  if (normalized && known.includes(normalized)) {
    return i18n.t(`paymentStatus.${normalized}`);
  }
  return status ?? i18n.t("paymentStatus.unknown");
}

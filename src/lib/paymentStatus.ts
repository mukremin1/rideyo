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
  switch (status) {
    case PAYMENT_STATUS.PENDING:
      return "Ödeme Bekliyor";
    case PAYMENT_STATUS.AUTHORIZED:
      return "Provizyon Alındı";
    case PAYMENT_STATUS.COMPLETED:
    case "paid":
      return "Ödendi";
    case PAYMENT_STATUS.IN_PROGRESS:
      return "Kiralama Aktif";
    case PAYMENT_STATUS.FAILED:
      return "Ödeme Başarısız";
    case PAYMENT_STATUS.REFUNDED:
      return "İade Edildi";
    case PAYMENT_STATUS.CANCELLED:
      return "İptal Edildi";
    default:
      return status ?? "Bilinmiyor";
  }
}

export type LongTermDeliveryMode = "immediate" | "scheduled";

export function resolveLongTermStartTime(
  mode: LongTermDeliveryMode,
  scheduledDate: string,
  scheduledTime: string,
): { start: Date | null; error?: "missing" | "invalid" | "past" } {
  if (mode === "immediate") {
    return { start: new Date() };
  }

  if (!scheduledDate.trim() || !scheduledTime.trim()) {
    return { start: null, error: "missing" };
  }

  const start = new Date(`${scheduledDate}T${scheduledTime}`);
  if (Number.isNaN(start.getTime())) {
    return { start: null, error: "invalid" };
  }

  if (start.getTime() <= Date.now()) {
    return { start: null, error: "past" };
  }

  return { start };
}

export function computeLongTermEndTime(
  start: Date,
  options: { rentalDays: number; rentalMonths: number; isMonthly: boolean },
): Date {
  const end = new Date(start);
  if (options.isMonthly) {
    end.setDate(end.getDate() + 30 * options.rentalMonths);
  } else {
    end.setDate(end.getDate() + options.rentalDays);
  }
  return end;
}

export function getDefaultScheduledDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDefaultScheduledTime(): string {
  const next = new Date();
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`;
}

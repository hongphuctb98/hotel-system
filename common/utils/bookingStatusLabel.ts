import type { BookingStatus } from "@/types/master.types";

type TranslateFn = (key: string) => string;

const BOOKING_STATUS_LABEL_KEYS: Record<string, string> = {
  PENDING: "booking.statusPending",
  CONFIRMED: "booking.statusConfirmed",
  CHECKED_IN: "booking.statusCheckedIn",
  CHECKED_OUT: "booking.statusCheckedOut",
  CANCELLED: "booking.statusCancelled",
  NO_SHOW: "booking.statusNoShow",
};

export function getBookingStatusLabel(
  status: Pick<BookingStatus, "code" | "name">,
  t: TranslateFn
): string {
  const key = BOOKING_STATUS_LABEL_KEYS[status.code];
  return key ? t(key) : status.name;
}

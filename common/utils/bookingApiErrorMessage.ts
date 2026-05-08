import type { ApiError } from "@/common/services/apiClient";

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

function readErrorData(err: ApiError): Record<string, string | number> {
  if (!err.data || typeof err.data !== "object" || Array.isArray(err.data)) return {};

  return Object.fromEntries(
    Object.entries(err.data).filter(([, value]) => typeof value === "string" || typeof value === "number")
  );
}

export function getBookingApiErrorMessage(err: ApiError, t: TranslateFn): string {
  const data = readErrorData(err);

  switch (err.code) {
    case "BOOKING_OVERLAP":
      return t("booking.errors.bookingOverlap");
    case "ROOM_HAS_LEASE":
      return t("booking.errors.roomHasLease");
    case "BOOKING_NOT_CONFIRMED":
      return t("booking.errors.bookingNotConfirmed");
    case "BOOKING_NOT_CHECKED_IN":
      return t("booking.errors.bookingNotCheckedIn");
    case "ROOM_NOT_READY":
      return t("booking.errors.roomNotReady");
    case "CHECKIN_TOO_EARLY":
      return t("booking.errors.checkInTooEarly");
    case "CHECKIN_DATE_PASSED":
      return t("booking.errors.checkInDatePassed");
    case "CHECKOUT_TOO_EARLY":
      return typeof data.remainingMinutes === "number"
        ? t("booking.errors.checkOutTooEarlyHourly", { minutes: data.remainingMinutes })
        : t("booking.errors.checkOutTooEarly");
    case "DEPOSIT_LOCKED":
      return t("booking.errors.depositLocked");
    case "CHECKOUT_AFTER_CHECKIN_REQUIRED":
      return t("booking.errors.checkOutAfterCheckIn");
    case "HOURLY_MIN_DURATION_REQUIRED":
      return t("booking.errors.hourlyMinDuration", { hours: data.minHours ?? 0 });
    case "DAILY_SAME_DAY_REQUIRED":
      return t("booking.errors.dailySameDayRequired");
    case "NIGHTLY_OVERNIGHT_REQUIRED":
      return t("booking.errors.nightlyOvernightRequired");
    default:
      return err.message;
  }
}

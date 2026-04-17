import { formatDate } from "@/common/utils/date";
import { getBookingStatusLabel } from "@/common/utils/bookingStatusLabel";
import type { AuditLogRecord } from "@/common/services/auditLogService";
import type { BookingStatus, RoomStatus } from "@/types/master.types";

type TranslateFn = (key: string) => string;
type Locale = "en" | "vi";

type SummaryOptions = {
  locale: Locale;
  t: TranslateFn;
  bookingStatuses: BookingStatus[];
  roomStatuses: RoomStatus[];
};

function getFieldLabel(field: string, t: TranslateFn): string {
  switch (field) {
    case "bookingStatusId":
    case "roomStatusId":
      return t("common.status");
    case "checkInDate":
      return t("booking.checkIn");
    case "checkOutDate":
      return t("booking.checkOut");
    default:
      return field;
  }
}

function getFieldValueLabel(
  field: string,
  value: unknown,
  { locale, t, bookingStatuses, roomStatuses }: SummaryOptions
): string {
  if (value == null || value === "") return "?";

  if (field === "bookingStatusId") {
    const status = bookingStatuses.find((item) => item.id === value);
    return status ? getBookingStatusLabel(status, t) : String(value);
  }

  if (field === "roomStatusId") {
    const status = roomStatuses.find((item) => item.id === value);
    return status?.name ?? String(value);
  }

  if (
    (field === "checkInDate" ||
      field === "checkOutDate" ||
      field === "actualCheckIn" ||
      field === "actualCheckOut") &&
    typeof value === "string"
  ) {
    return formatDate(value, locale);
  }

  return String(value);
}

export function getAuditSummaryText(
  record: AuditLogRecord,
  options: SummaryOptions
): string {
  const values = record.newValues;
  if (!values) return "—";

  if (record.action === "CREATE" && record.entityType === "BOOKING") {
    return [
      values.bookingNumber ? `#${values.bookingNumber}` : "",
      values.checkInDate ? formatDate(String(values.checkInDate), options.locale) : "",
      values.checkOutDate ? `→ ${formatDate(String(values.checkOutDate), options.locale)}` : "",
      values.chargeType ? String(values.chargeType) : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (record.action === "PAYMENT") {
    return values.amount ? `${Number(values.amount).toLocaleString()} VND` : "—";
  }

  if (record.action === "UPDATE" && (record.entityType === "BOOKING" || record.entityType === "ROOM")) {
    const parts = Object.keys(values).map((field) => {
      const oldVal = record.oldValues?.[field];
      const oldLabel = getFieldValueLabel(field, oldVal, options);
      const newLabel = getFieldValueLabel(field, values[field], options);
      return `${getFieldLabel(field, options.t)}: ${oldLabel} → ${newLabel}`;
    });
    return parts.join(" · ") || "—";
  }

  return (
    Object.entries(values)
      .slice(0, 3)
      .map(([key, val]) => `${getFieldLabel(key, options.t)}: ${getFieldValueLabel(key, val, options)}`)
      .join(" · ") || "—"
  );
}

import { getApiErrorMessage } from "./apiErrorMessage";

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

const LONG_TERM_ERROR_CODES = new Set([
  "ROOM_HAS_ACTIVE_LEASE",
  "ROOM_HAS_BOOKING",
  "LEASE_END_AFTER_START_REQUIRED",
  "LEASE_ALREADY_EXPIRED",
  "LEASE_ALREADY_ACTIVE",
  "LEASE_HAS_UNPAID_BILLS",
  "BILL_NOT_DRAFT",
  "BILL_HAS_PENDING_READINGS",
  "BILL_NOT_SENDABLE",
  "PAYMENT_EXCEEDS_BALANCE",
  "READING_CURRENT_LESS_THAN_PREV",
  "VALIDATION_REQUIRED",
  "MISSING_RATE_PLAN",
  "MISSING_RATE_PLAN_ITEM",
  "FEE_ITEM_NOT_METERED",
  "FEE_ITEM_IN_USE",
  "RATE_PLAN_IN_USE",
  "FEE_ITEM_CODE_TAKEN",
  "READING_DUPLICATE",
  "BILL_ALREADY_APPROVED",
]);

export function getLongTermApiErrorMessage(err: unknown, t: TranslateFn): string {
  return getApiErrorMessage(err, t, "longTerm.errors", LONG_TERM_ERROR_CODES);
}

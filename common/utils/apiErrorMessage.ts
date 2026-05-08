import type { ApiError } from "@/common/services/apiClient";

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

/**
 * Generic API error message resolver.
 *
 * Checks if `err` is an ApiError whose `code` is in `knownCodes`, then
 * returns `t(`${keyPrefix}.${code}`)`. Falls back to `err.message` or
 * String(err) for unrecognised errors.
 *
 * Usage:
 *   getApiErrorMessage(err, t, "longTerm.errors", LONG_TERM_ERROR_CODES)
 *   getApiErrorMessage(err, t, "inventory.errors", INVENTORY_ERROR_CODES)
 */
export function getApiErrorMessage(
  err: unknown,
  t: TranslateFn,
  keyPrefix: string,
  knownCodes: ReadonlySet<string>
): string {
  const apiErr = err as Partial<ApiError>;
  if (apiErr?.code && knownCodes.has(apiErr.code)) {
    return t(`${keyPrefix}.${apiErr.code}`);
  }
  return err instanceof Error ? err.message : String(err);
}

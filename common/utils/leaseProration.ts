import dayjs from "dayjs";

/**
 * Calculates the pro-rated rent for a given billing month.
 *
 * - Full month (lease covers entire month): returns monthlyRent
 * - Partial first month (move-in mid-month): monthlyRent × (daysRemaining / daysInMonth)
 *   e.g. move-in Apr 15 → 16/30 × rent
 * - Partial last month (move-out mid-month): monthlyRent × (leaveDay / daysInMonth)
 *   e.g. move-out May 20 → 20/31 × rent
 * - Edge case last day: 1/daysInMonth × rent
 */
export function calculateProratedRent(
  monthlyRent: number,
  startDate: Date,
  endDate: Date | null,
  billingMonth: string
): number {
  const periodStart = dayjs(`${billingMonth}-01`);
  const daysInMonth = periodStart.daysInMonth();
  const periodEnd = periodStart.endOf("month");

  const leaseStart = dayjs(startDate);
  const leaseEnd = endDate ? dayjs(endDate) : null;

  // Determine effective start for this billing period
  const effectiveStart = leaseStart.isAfter(periodStart) ? leaseStart : periodStart;
  // Determine effective end for this billing period
  const effectiveEnd = leaseEnd && leaseEnd.isBefore(periodEnd) ? leaseEnd : periodEnd;

  if (effectiveStart.isAfter(effectiveEnd)) return 0;

  // Days the tenant occupies within this billing month (inclusive)
  const occupiedDays = effectiveEnd.date() - effectiveStart.date() + 1;

  if (occupiedDays >= daysInMonth) return monthlyRent;

  return Math.round((monthlyRent * occupiedDays) / daysInMonth);
}

/**
 * Client-safe timezone utilities.
 *
 * Safe to import in both Server and Client Components.
 * Does NOT read process.env or any Node.js-only globals.
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Parse a UTC ISO string or Date and return a dayjs instance in the hotel timezone.
 * Returns null for nullish input.
 */
export function toHotelDayjs(
  date: string | Date | null | undefined,
  tz: string
): dayjs.Dayjs | null {
  if (!date) return null;
  return dayjs(date).tz(tz);
}

/**
 * Convert a hotel-timezone dayjs value (e.g. from an Ant Design DatePicker)
 * back to a UTC ISO string for API payloads.
 * Returns null for nullish input.
 */
export function fromHotelDayjs(
  d: dayjs.Dayjs | null | undefined,
  tz: string
): string | null {
  if (!d) return null;
  // Re-interpret the wall-clock time as the hotel timezone, then convert to UTC
  return dayjs.tz(d.format("YYYY-MM-DD HH:mm:ss"), tz).toISOString();
}

/**
 * Format a UTC date for display in the hotel timezone.
 * Returns "-" for nullish input.
 */
export function formatInTimezone(
  date: string | Date | null | undefined,
  tz: string,
  fmt = "DD/MM/YYYY HH:mm"
): string {
  if (!date) return "-";
  return dayjs(date).tz(tz).format(fmt);
}

/**
 * Returns a dayjs object representing "today" in the hotel timezone.
 * Used for disabledDate constraints so "past" is not computed from browser time.
 */
export function todayInTimezone(tz: string): dayjs.Dayjs {
  return dayjs().tz(tz).startOf("day");
}

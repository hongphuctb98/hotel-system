/**
 * Hotel-timezone date utilities — SERVER-SIDE ONLY.
 *
 * Reads HOTEL_TIMEZONE from env (default: Asia/Ho_Chi_Minh).
 * Never import this in client components — it reads process.env and registers
 * dayjs plugins at module load time.
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export function getHotelTimezone(): string {
  return process.env.HOTEL_TIMEZONE ?? "Asia/Ho_Chi_Minh";
}

/**
 * Convert a YYYY-MM-DD calendar date (in hotel local time) to UTC Date boundaries.
 *
 * This is the correct replacement for any UTC-midnight approach.  Example for
 * HOTEL_TIMEZONE=Asia/Ho_Chi_Minh (UTC+7):
 *
 *   buildLocalDayBoundsUTC("2026-04-14")
 *   → { start: 2026-04-13T17:00:00.000Z, end: 2026-04-14T16:59:59.999Z }
 *
 * A booking with checkInDate=2026-04-13T17:00Z (= local midnight 2026-04-14)
 * will correctly match the April 14 window and NOT match the April 13 window.
 */
export function buildLocalDayBoundsUTC(dateStr: string): { start: Date; end: Date } {
  const tz    = getHotelTimezone();
  const start = dayjs.tz(`${dateStr} 00:00:00`,     tz).toDate();
  const end   = dayjs.tz(`${dateStr} 23:59:59.999`, tz).toDate();
  return { start, end };
}

/**
 * Return the current (or given) instant as a YYYY-MM-DD string in the hotel's
 * local timezone.
 *
 * Use this instead of new Date().toISOString().slice(0, 10) in API route handlers
 * so that the "today" default always reflects the hotel's local calendar date, not
 * the UTC date of the server.
 */
export function hotelLocalDate(d: Date = new Date()): string {
  return dayjs(d).tz(getHotelTimezone()).format("YYYY-MM-DD");
}

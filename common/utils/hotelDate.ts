/**
 * Hotel-timezone date utilities — SERVER-SIDE ONLY.
 *
 * Reads the configured timezone from the HotelSettings DB row, falling back
 * to HOTEL_TIMEZONE env (default: Asia/Ho_Chi_Minh).
 * Never import this in client components.
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { prisma } from "@/lib/prisma";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function getHotelTimezone(): Promise<string> {
  try {
    const row = await prisma.hotelSettings.findUnique({ where: { id: "singleton" } });
    if (row?.timezone) return row.timezone;
  } catch {
    // DB unavailable — fall through to env fallback
  }
  return process.env.HOTEL_TIMEZONE ?? "Asia/Ho_Chi_Minh";
}

/**
 * Convert a YYYY-MM-DD calendar date (in hotel local time) to UTC Date boundaries.
 *
 * Example for Asia/Ho_Chi_Minh (UTC+7):
 *   buildLocalDayBoundsUTC("2026-04-14")
 *   → { start: 2026-04-13T17:00:00.000Z, end: 2026-04-14T16:59:59.999Z }
 */
export async function buildLocalDayBoundsUTC(dateStr: string): Promise<{ start: Date; end: Date }> {
  const tz    = await getHotelTimezone();
  const start = dayjs.tz(`${dateStr} 00:00:00`,     tz).toDate();
  const end   = dayjs.tz(`${dateStr} 23:59:59.999`, tz).toDate();
  return { start, end };
}

/**
 * Return the current (or given) instant as a YYYY-MM-DD string in the hotel's
 * local timezone.
 */
export async function hotelLocalDate(d: Date = new Date()): Promise<string> {
  const tz = await getHotelTimezone();
  return dayjs(d).tz(tz).format("YYYY-MM-DD");
}

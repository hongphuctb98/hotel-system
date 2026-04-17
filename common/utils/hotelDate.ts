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

// In-process cache: timezone is effectively static for a hotel deployment.
// Invalidated after 10 minutes so a settings change is eventually picked up
// without requiring a server restart.
let _tzCache: string | null = null;
let _tzCachedAt = 0;
const TZ_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getHotelTimezone(): Promise<string> {
  const now = Date.now();
  if (_tzCache && now - _tzCachedAt < TZ_CACHE_TTL_MS) return _tzCache;
  try {
    const row = await prisma.hotelSettings.findUnique({ where: { id: "singleton" } });
    if (row?.timezone) {
      _tzCache = row.timezone;
      _tzCachedAt = now;
      return _tzCache;
    }
  } catch {
    // DB unavailable — fall through to env fallback
  }
  const fallback = process.env.HOTEL_TIMEZONE ?? "Asia/Ho_Chi_Minh";
  _tzCache = fallback;
  _tzCachedAt = now;
  return fallback;
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

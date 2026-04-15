import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/response";
import { buildLocalDayBoundsUTC } from "@/common/utils/hotelDate";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const checkInFrom = searchParams.get("checkInFrom");
    const checkInTo = searchParams.get("checkInTo");

    // Use hotel-local day boundaries (same as the reservations list) so that
    // a booking with checkInDate near UTC midnight is counted consistently.
    const where: Record<string, unknown> = {};
    if (checkInFrom || checkInTo) {
      const fromBounds = checkInFrom ? await buildLocalDayBoundsUTC(checkInFrom) : null;
      const toBounds   = checkInTo   ? await buildLocalDayBoundsUTC(checkInTo)   : null;
      where.checkInDate = {
        ...(fromBounds ? { gte: fromBounds.start } : {}),
        ...(toBounds   ? { lte: toBounds.end }     : {}),
      };
    }

    const bookings = await prisma.booking.findMany({
      where,
      select: {
        bookingStatusId: true,
        room: { select: { roomTypeId: true } },
      },
    });

    // Aggregate into { statusId+roomTypeId → count }
    const countMap = new Map<string, number>();
    for (const b of bookings) {
      const key = `${b.bookingStatusId}::${b.room.roomTypeId}`;
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    }

    const cells = Array.from(countMap.entries()).map(([key, count]) => {
      const [bookingStatusId, roomTypeId] = key.split("::");
      return { bookingStatusId, roomTypeId, count };
    });

    return ok({ cells });
  } catch (e) {
    return serverError(e);
  }
}

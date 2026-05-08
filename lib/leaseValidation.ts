import { prisma } from "@/lib/prisma";

/**
 * Returns the first active booking (CONFIRMED or CHECKED_IN) that overlaps
 * the given lease period, or null if no conflict exists.
 *
 * Overlap logic:
 *   - With endDate:    booking.checkInDate < leaseEnd  AND  booking.checkOutDate > leaseStart
 *   - Without endDate: booking.checkOutDate > leaseStart  (open-ended lease blocks all future bookings)
 */
export async function findBookingConflict(
  roomId: string,
  leaseStart: Date,
  leaseEnd: Date | null
) {
  const activeStatuses = await prisma.bookingStatus.findMany({
    where: { code: { in: ["CONFIRMED", "CHECKED_IN"] } },
    select: { id: true },
  });
  const activeStatusIds = activeStatuses.map((s) => s.id);

  return prisma.booking.findFirst({
    where: {
      roomId,
      bookingStatusId: { in: activeStatusIds },
      checkOutDate: { gt: leaseStart },
      ...(leaseEnd ? { checkInDate: { lt: leaseEnd } } : {}),
    },
  });
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";

const OPERATIONAL_LOCK_CODES = new Set(["CLEANING", "MAINTENANCE", "OUT_OF_SERVICE"]);

export async function POST(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        bookingStatus: true,
        room: { include: { roomStatus: true } },
      },
    });
    if (!booking) return notFound();

    // Only CONFIRMED (reserved) bookings can be cancelled from the room map
    if (booking.bookingStatus.code !== "CONFIRMED") {
      return badRequest(
        `Cannot cancel: booking is currently '${booking.bookingStatus.code}'. Only CONFIRMED bookings can be cancelled.`,
        "BOOKING_NOT_CANCELLABLE"
      );
    }

    const [cancelledStatus, availableRoomStatus] = await Promise.all([
      prisma.bookingStatus.findFirst({ where: { code: "CANCELLED" } }),
      prisma.roomStatus.findFirst({ where: { code: "AVAILABLE" } }),
    ]);

    if (!cancelledStatus) return badRequest("Booking status 'CANCELLED' not found.");

    // Cancel booking and reset room to AVAILABLE unless an operational lock
    // (cleaning / maintenance / out of service) should keep control of the room.
    await prisma.$transaction([
      prisma.booking.update({
        where: { id },
        data: { bookingStatusId: cancelledStatus.id },
      }),
      ...(availableRoomStatus && !OPERATIONAL_LOCK_CODES.has(booking.room.roomStatus.code)
        ? [
            prisma.room.update({
              where: { id: booking.roomId },
              data: { roomStatusId: availableRoomStatus.id },
            }),
          ]
        : []),
    ]);

    void writeAudit({
      action:     "CANCEL",
      entityType: "BOOKING",
      entityId:   id,
      roomId:     booking.roomId,
    });

    return ok({ cancelled: true });
  } catch (e) {
    return serverError(e);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, conflict, serverError } from "@/lib/response";

export async function POST(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    // Load booking with its current status and room operational status
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        bookingStatus: true,
        room: { include: { roomStatus: true } },
      },
    });
    if (!booking) return notFound();

    // ── Status guard — only CONFIRMED bookings can be checked in ─────────
    if (booking.bookingStatus.code !== "CONFIRMED") {
      return badRequest(
        `Cannot check in: booking is currently '${booking.bookingStatus.code}'. Only CONFIRMED bookings can be checked in.`,
        "BOOKING_NOT_CONFIRMED"
      );
    }

    // ── Room operational state guard ──────────────────────────────────────
    if (!booking.room.roomStatus.isSellable) {
      return badRequest(
        `Cannot check in: room is currently '${booking.room.roomStatus.name}' and is not ready for guests.`,
        "ROOM_NOT_READY"
      );
    }

    // ── Duplicate active check-in guard ───────────────────────────────────
    // Prevent a second active check-in on the same room.
    const checkedInStatus = await prisma.bookingStatus.findFirst({
      where: { code: "CHECKED_IN" },
    });
    if (checkedInStatus) {
      const existingCheckIn = await prisma.booking.findFirst({
        where: {
          roomId:          booking.roomId,
          bookingStatusId: checkedInStatus.id,
          id:              { not: id },
        },
      });
      if (existingCheckIn) {
        return conflict(
          "This room already has an active check-in. Check out the current guest first.",
          "BOOKING_OVERLAP"
        );
      }
    }

    // ── Perform check-in ──────────────────────────────────────────────────
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        actualCheckIn:   new Date(),
        ...(checkedInStatus && { bookingStatusId: checkedInStatus.id }),
      },
      include: {
        guest: true,
        room:  { include: { roomStatus: true } },
        bookingStatus: true,
      },
    });

    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

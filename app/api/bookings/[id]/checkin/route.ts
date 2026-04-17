import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, conflict, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";
import { hotelLocalDate } from "@/common/utils/hotelDate";

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

    // ── Date guard — check-in is allowed only on the scheduled check-in date ─
    const [todayStr, scheduledInStr] = await Promise.all([
      hotelLocalDate(),
      hotelLocalDate(booking.checkInDate),
    ]);
    if (todayStr < scheduledInStr) {
      return badRequest(
        `Cannot check in: today is ${todayStr} but this booking is scheduled for ${scheduledInStr}.`,
        "CHECKIN_TOO_EARLY"
      );
    }
    if (todayStr > scheduledInStr) {
      return badRequest(
        `Cannot check in: today is ${todayStr} but this booking was scheduled for ${scheduledInStr}.`,
        "CHECKIN_DATE_PASSED"
      );
    }

    // ── Room operational state guard ──────────────────────────────────────
    // Block only on physical operational locks. RESERVED is non-sellable but is
    // the correct pre-checkin state (set when the booking was confirmed), so it
    // must not be blocked here. AVAILABLE is also valid (e.g. walk-in same-day).
    const OPERATIONAL_LOCK_CODES = new Set(["CLEANING", "MAINTENANCE", "OUT_OF_SERVICE"]);
    if (OPERATIONAL_LOCK_CODES.has(booking.room.roomStatus.code)) {
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
    // Resolve OCCUPIED room status in parallel with the booking update.
    const [updated, occupiedRoomStatus] = await Promise.all([
      prisma.booking.update({
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
      }),
      prisma.roomStatus.findFirst({ where: { code: "OCCUPIED" } }),
    ]);

    // Business rule: CHECKED_IN booking must move the room to OCCUPIED so the
    // room-map card reflects an active stay rather than a reserved/available room.
    if (occupiedRoomStatus) {
      await prisma.room.update({
        where: { id: booking.roomId },
        data: { roomStatusId: occupiedRoomStatus.id },
      });
    }

    await writeAudit({
      action:     "CHECK_IN",
      entityType: "BOOKING",
      entityId:   id,
      roomId:     booking.roomId,
    });

    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

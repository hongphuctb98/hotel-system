import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, conflict, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";
import { hotelLocalDate } from "@/common/utils/hotelDate";

const bookingInclude = {
  guest: { include: { guestType: true } },
  room: { include: { floor: true, roomType: true, roomStatus: true } },
  bookingStatus: true,
  services: { include: { serviceItem: true } },
  invoices: { include: { payments: { include: { paymentMethod: true } } } },
};

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
    if (!booking) return notFound();
    return ok(booking);
  } catch (e) {
    return serverError(e);
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await req.json();

    // Fetch current booking state (used for deposit guard, date validation, and audit diff)
    const TRACKED = [
      "bookingStatusId", "roomId", "checkInDate", "checkOutDate",
      "baseRate", "chargeType", "discountAmount", "surchargeAmount",
      "depositAmount", "hourlyBlockHours", "hourlyRatePerHour", "source", "note",
    ] as const;

    const prev = await prisma.booking.findUnique({
      where: { id },
      select: Object.fromEntries(TRACKED.map((f) => [f, true])) as Record<typeof TRACKED[number], true>,
    });
    if (!prev) return notFound();

    // Guard: depositAmount is locked once any payment has been recorded
    if (body.depositAmount !== undefined) {
      const invoices = await prisma.invoice.findMany({
        where: { bookingId: id },
        select: { payments: { take: 1, select: { id: true } } },
      });
      const hasPayments = invoices.some((inv) => inv.payments.length > 0);
      if (hasPayments) {
        return badRequest(
          "Deposit amount cannot be changed after a payment has been recorded.",
          "DEPOSIT_LOCKED"
        );
      }
    }

    // ── Date-consistency guard (applied when either date is being changed) ─
    if (body.checkInDate !== undefined || body.checkOutDate !== undefined) {
      const checkIn  = new Date(body.checkInDate  ?? prev.checkInDate);
      const checkOut = new Date(body.checkOutDate ?? prev.checkOutDate);

      if (checkIn >= checkOut) {
        return badRequest("Check-in date must be before check-out date", "DATE_RANGE_INVALID");
      }

      const chargeType       = body.chargeType       ?? prev.chargeType;
      const hourlyBlockHours = body.hourlyBlockHours ?? prev.hourlyBlockHours;

      if (chargeType === "hourly" && hourlyBlockHours) {
        const blockMs = Number(hourlyBlockHours) * 60 * 60 * 1000;
        if (checkOut.getTime() - checkIn.getTime() < blockMs) {
          return badRequest(
            `For hourly bookings, check-out must be at least ${hourlyBlockHours} hour(s) after check-in.`,
            "DATE_RANGE_INVALID"
          );
        }
      } else {
        const [checkInDay, checkOutDay] = await Promise.all([
          hotelLocalDate(checkIn),
          hotelLocalDate(checkOut),
        ]);
        if (checkInDay >= checkOutDay) {
          return badRequest(
            "For nightly bookings, check-out must be on a later calendar day than check-in.",
            "DATE_RANGE_INVALID"
          );
        }
      }
    }

    // ── Overlap guard (mirrors create logic, excludes self) ───────────────
    if (body.roomId !== undefined || body.checkInDate !== undefined || body.checkOutDate !== undefined) {
      const effectiveRoomId  = body.roomId      ?? prev.roomId;
      const effectiveCheckIn = new Date(body.checkInDate  ?? prev.checkInDate);
      const effectiveCheckOut= new Date(body.checkOutDate ?? prev.checkOutDate);

      const activeStatuses = await prisma.bookingStatus.findMany({
        where: { code: { in: ["CONFIRMED", "CHECKED_IN"] } },
        select: { id: true },
      });
      const activeStatusIds = activeStatuses.map((s) => s.id);

      const overlap = await prisma.booking.findFirst({
        where: {
          id:              { not: id },
          roomId:          effectiveRoomId,
          bookingStatusId: { in: activeStatusIds },
          checkInDate:     { lt: effectiveCheckOut },
          checkOutDate:    { gt: effectiveCheckIn },
        },
      });

      if (overlap) {
        return conflict(
          "This room is already booked for the selected dates",
          "BOOKING_OVERLAP"
        );
      }
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        ...(body.bookingStatusId  !== undefined && { bookingStatusId:  body.bookingStatusId }),
        ...(body.roomId           !== undefined && { roomId:           body.roomId }),
        ...(body.checkInDate      !== undefined && { checkInDate:      new Date(body.checkInDate) }),
        ...(body.checkOutDate     !== undefined && { checkOutDate:     new Date(body.checkOutDate) }),
        ...(body.baseRate         !== undefined && { baseRate:         Number(body.baseRate) }),
        ...(body.chargeType       !== undefined && { chargeType:       body.chargeType }),
        ...(body.discountAmount   !== undefined && { discountAmount:   Number(body.discountAmount) }),
        ...(body.surchargeAmount  !== undefined && { surchargeAmount:  Number(body.surchargeAmount) }),
        ...(body.depositAmount     !== undefined && { depositAmount:     Number(body.depositAmount) }),
        ...(body.hourlyBlockHours  !== undefined && { hourlyBlockHours:  body.hourlyBlockHours != null ? Number(body.hourlyBlockHours) : null }),
        ...(body.hourlyRatePerHour !== undefined && { hourlyRatePerHour: body.hourlyRatePerHour != null ? Number(body.hourlyRatePerHour) : null }),
        ...(body.source            !== undefined && { source:            body.source }),
        ...(body.note              !== undefined && { note:              body.note }),
      },
      include: bookingInclude,
    });

    // Build old/new diff — only include fields that actually changed
    {
      const oldValues: Record<string, unknown> = {};
      const newValues: Record<string, unknown> = {};

      for (const field of TRACKED) {
        if (body[field] === undefined) continue;
        const oldVal = prev[field];
        const newVal = booking[field as keyof typeof booking];
        const oldStr = oldVal instanceof Date ? oldVal.toISOString() : String(oldVal ?? "");
        const newStr = newVal instanceof Date ? (newVal as Date).toISOString() : String(newVal ?? "");
        if (oldStr !== newStr) {
          oldValues[field] = oldVal instanceof Date ? oldVal.toISOString() : oldVal;
          newValues[field] = newVal instanceof Date ? (newVal as Date).toISOString() : newVal;
        }
      }

      if (Object.keys(newValues).length > 0) {
        await writeAudit({
          action:     "UPDATE",
          entityType: "BOOKING",
          entityId:   id,
          roomId:     booking.roomId,
          oldValues,
          newValues,
        });
      }
    }

    return ok(booking);
  } catch (e) {
    return serverError(e);
  }
}

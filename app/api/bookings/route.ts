import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, conflict, serverError } from "@/lib/response";
import { parseQueryParams } from "@/common/utils/queryParams";
import { buildLocalDayBoundsUTC } from "@/common/utils/hotelDate";
import { generateBookingNumber } from "@/common/utils/bookingNumber";
import { generateInvoiceNumber } from "@/common/utils/invoiceNumber";

const bookingInclude = {
  guest: { include: { guestType: true } },
  room: { include: { floor: true, roomType: true, roomStatus: true } },
  bookingStatus: true,
  services: { include: { serviceItem: true } },
  invoices: true,
};

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, filters } = parseQueryParams(req.nextUrl.searchParams);
    const skip = (page - 1) * limit;

    const isExport = req.nextUrl.searchParams.get("export") === "1";

    const where: Record<string, unknown> = {};
    if (filters.bookingStatusId) where.bookingStatusId = filters.bookingStatusId;
    if (filters.roomTypeId) where.room = { roomTypeId: filters.roomTypeId };
    if (filters.checkInFrom || filters.checkInTo) {
      const fromBounds = filters.checkInFrom ? await buildLocalDayBoundsUTC(filters.checkInFrom) : null;
      const toBounds = filters.checkInTo ? await buildLocalDayBoundsUTC(filters.checkInTo) : null;
      where.checkInDate = {
        ...(fromBounds ? { gte: fromBounds.start } : {}),
        ...(toBounds ? { lte: toBounds.end } : {}),
      };
    }
    if (search) {
      where.OR = [
        { guest: { firstName: { contains: search, mode: "insensitive" } } },
        { guest: { lastName:  { contains: search, mode: "insensitive" } } },
        { bookingNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isExport) {
      const bookings = await prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { createdAt: "desc" },
      });
      return ok(bookings, { total: bookings.length, page: 1, limit: bookings.length, totalPages: 1 });
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: bookingInclude,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.count({ where }),
    ]);

    return ok(bookings, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Required fields ───────────────────────────────────────────────────
    if (!body.guestId)          return badRequest("Guest is required");
    if (!body.roomId)           return badRequest("Room is required");
    if (!body.checkInDate)      return badRequest("Check-in date is required");
    if (!body.checkOutDate)     return badRequest("Check-out date is required");
    if (!body.bookingStatusId)  return badRequest("Booking status is required");

    const checkIn  = new Date(body.checkInDate);
    const checkOut = new Date(body.checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return badRequest("Invalid date format");
    }

    // ── Date ordering ─────────────────────────────────────────────────────
    if (checkIn >= checkOut) {
      return badRequest("Check-in date must be before check-out date");
    }

    // ── Overlap check — no active booking may overlap this range ──────────
    // Active = CONFIRMED or CHECKED_IN; CANCELLED / NO_SHOW / CHECKED_OUT are ignored.
    const activeStatuses = await prisma.bookingStatus.findMany({
      where: { code: { in: ["CONFIRMED", "CHECKED_IN"] } },
      select: { id: true },
    });
    const activeStatusIds = activeStatuses.map((s) => s.id);

    const overlap = await prisma.booking.findFirst({
      where: {
        roomId:          body.roomId,
        bookingStatusId: { in: activeStatusIds },
        checkInDate:     { lt: checkOut },
        checkOutDate:    { gt: checkIn },
      },
    });

    if (overlap) {
      return conflict(
        "This room is already booked for the selected dates",
        "BOOKING_OVERLAP"
      );
    }

    // ── Create ────────────────────────────────────────────────────────────
    const nights = Math.max(
      1,
      Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    );
    const baseRate        = Number(body.baseRate        ?? 0);
    const discountAmount  = Number(body.discountAmount  ?? 0);
    const surchargeAmount = Number(body.surchargeAmount ?? 0);
    const depositAmount   = Number(body.depositAmount   ?? 0);
    const roomTotal       = nights * baseRate;

    // Generate unique 6-char booking number with collision retry
    let booking;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        booking = await prisma.booking.create({
          data: {
            bookingNumber:   generateBookingNumber(),
            guestId:         body.guestId,
            roomId:          body.roomId,
            bookingStatusId: body.bookingStatusId,
            checkInDate:     checkIn,
            checkOutDate:    checkOut,
            adults:          body.adults   ?? 1,
            children:        body.children ?? 0,
            baseRate,
            totalAmount:     roomTotal,
            depositAmount,
            discountAmount,
            surchargeAmount,
            chargeType:       body.chargeType ?? "nightly",
            hourlyBlockHours:  body.hourlyBlockHours  != null ? Number(body.hourlyBlockHours)  : null,
            hourlyRatePerHour: body.hourlyRatePerHour != null ? Number(body.hourlyRatePerHour) : null,
            source:           body.source,
            note:             body.note ?? null,
          },
          include: bookingInclude,
        });
        break; // success — exit retry loop
      } catch (err: unknown) {
        // P2002 = unique constraint violation; retry with a new code
        if (
          typeof err === "object" &&
          err !== null &&
          "code" in err &&
          (err as { code: string }).code === "P2002" &&
          attempt < 9
        ) {
          continue;
        }
        throw err;
      }
    }
    if (!booking) throw new Error("Failed to generate a unique booking number after 10 attempts");

    // ── Sync room status for CONFIRMED booking ─────────────────────────────
    // Business rule: a CONFIRMED booking must move the room to RESERVED so the
    // room-map card reflects that the room is no longer freely available.
    if (booking.bookingStatus.code === "CONFIRMED") {
      const reservedRoomStatus = await prisma.roomStatus.findFirst({
        where: { code: "RESERVED" },
      });
      if (reservedRoomStatus) {
        await prisma.room.update({
          where: { id: booking.roomId },
          data: { roomStatusId: reservedRoomStatus.id },
        });
      }
    }

    // ── Record deposit payment ─────────────────────────────────────────────
    // If a deposit was collected up-front with a payment method, create an
    // Invoice (with the discount applied) and a matching Payment record.
    if (depositAmount > 0 && body.paymentMethodId) {
      const subtotal    = roomTotal + surchargeAmount;
      const invoiceTotal = subtotal - discountAmount;
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber:  await generateInvoiceNumber(prisma),
          bookingId:      booking.id,
          subtotal,
          taxAmount:      0,
          discountAmount,
          totalAmount:    invoiceTotal,
          isPaid:         depositAmount >= invoiceTotal,
        },
      });
      await prisma.payment.create({
        data: {
          invoiceId:       invoice.id,
          paymentMethodId: body.paymentMethodId,
          amount:          depositAmount,
        },
      });
    }

    return created(booking);
  } catch (e) {
    return serverError(e);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, conflict, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";
import { hotelLocalDate } from "@/common/utils/hotelDate";
import { TAX_RATE } from "@/common/constants/currency";
import { buildStayPriceInput, calculateStayPrice } from "@/common/utils/stayPricing";

const bookingInclude = {
  guest: { include: { guestType: true } },
  room: { include: { floor: true, roomType: true, roomStatus: true } },
  bookingStatus: true,
  services: { include: { serviceItem: true } },
  invoices: { include: { payments: { include: { paymentMethod: true } } } },
};

type BillingSyncClient = Pick<typeof prisma, "booking" | "invoice">;

function calculateBookingRoomTotal(input: {
  chargeType: string | null;
  baseRate: number;
  checkInDate: Date;
  checkOutDate: Date;
  hourlyRatePerHour?: number | null;
}) {
  const chargeType = input.chargeType ?? "nightly";
  const hoursStayed = chargeType === "hourly"
    ? Math.max(0, Math.ceil((input.checkOutDate.getTime() - input.checkInDate.getTime()) / (1000 * 60 * 60)))
    : 0;

  return calculateStayPrice(
    buildStayPriceInput(
      {
        chargeType,
        baseRate: input.baseRate,
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        hourlyRatePerHour: input.hourlyRatePerHour ?? 0,
      },
      hoursStayed,
    )
  );
}

async function syncInvoice(client: BillingSyncClient, bookingId: string): Promise<void> {
  const booking = await client.booking.findUnique({
    where:   { id: bookingId },
    include: { services: true, invoices: { include: { payments: true } } },
  });
  if (!booking || booking.invoices.length === 0) return;

  const invoice       = booking.invoices[0];
  const roomTotal     = Number(booking.totalAmount);
  const surcharge     = Number(booking.surchargeAmount ?? 0);
  const discount      = Number(booking.discountAmount ?? 0);
  const servicesTotal = booking.services.reduce((sum, service) => sum + Number(service.totalPrice), 0);
  const subtotal      = roomTotal + servicesTotal + surcharge;
  const taxAmount     = Math.round(subtotal * TAX_RATE);
  const totalAmount   = subtotal + taxAmount - discount;
  const paidSoFar     = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  await client.invoice.update({
    where: { id: invoice.id },
    data:  {
      subtotal,
      taxAmount,
      discountAmount: discount,
      totalAmount,
      isPaid: paidSoFar >= totalAmount,
    },
  });
}

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
      "adults", "children",
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
        return badRequest(
          "Check-in date must be before check-out date",
          "CHECKOUT_AFTER_CHECKIN_REQUIRED"
        );
      }

      const chargeType       = body.chargeType       ?? prev.chargeType;
      const hourlyBlockHours = body.hourlyBlockHours ?? prev.hourlyBlockHours;

      if (chargeType === "hourly" && hourlyBlockHours) {
        const blockMs = Number(hourlyBlockHours) * 60 * 60 * 1000;
        if (checkOut.getTime() - checkIn.getTime() < blockMs) {
          return badRequest(
            `For hourly bookings, check-out must be at least ${hourlyBlockHours} hour(s) after check-in.`,
            "HOURLY_MIN_DURATION_REQUIRED",
            { minHours: Number(hourlyBlockHours) }
          );
        }
      } else if (chargeType === "daily") {
        const [checkInDay, checkOutDay] = await Promise.all([
          hotelLocalDate(checkIn),
          hotelLocalDate(checkOut),
        ]);
        if (checkInDay !== checkOutDay) {
          return badRequest(
            "For daily bookings, check-in and check-out must be on the same calendar day.",
            "DAILY_SAME_DAY_REQUIRED"
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
            "NIGHTLY_OVERNIGHT_REQUIRED"
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

      // Condition A: active lease overlap
      const activeLeaseConflict = await prisma.leaseContract.findFirst({
        where: {
          roomId: effectiveRoomId,
          isActive: true,
          status: "ACTIVE",
          startDate: { lt: effectiveCheckOut },
          OR: [{ endDate: null }, { endDate: { gt: effectiveCheckIn } }],
        },
      });

      if (activeLeaseConflict) {
        return conflict("This room has an active long-term lease for the selected dates", "ROOM_HAS_LEASE");
      }

      // Condition B: 14-day buffer for pending/active lease
      const bufferDate = new Date(effectiveCheckOut.getTime() + 14 * 24 * 60 * 60 * 1000);
      const upcomingLeaseConflict = await prisma.leaseContract.findFirst({
        where: {
          roomId: effectiveRoomId,
          isActive: true,
          status: { in: ["PENDING", "ACTIVE"] },
          startDate: { gt: effectiveCheckIn, lt: bufferDate },
        },
      });

      if (upcomingLeaseConflict) {
        return conflict("This room has an upcoming long-term lease within 14 days of the requested checkout", "ROOM_HAS_LEASE");
      }
    }

    const effectiveCheckInDate = new Date(body.checkInDate ?? prev.checkInDate);
    const effectiveCheckOutDate = new Date(body.checkOutDate ?? prev.checkOutDate);
    const effectiveBaseRate = Number(body.baseRate ?? prev.baseRate ?? 0);
    const effectiveChargeType = body.chargeType ?? prev.chargeType ?? "nightly";
    const effectiveHourlyRatePerHour =
      body.hourlyRatePerHour !== undefined
        ? (body.hourlyRatePerHour != null ? Number(body.hourlyRatePerHour) : null)
        : (prev.hourlyRatePerHour != null ? Number(prev.hourlyRatePerHour) : null);
    const effectiveTotalAmount = calculateBookingRoomTotal({
      chargeType: effectiveChargeType,
      baseRate: effectiveBaseRate,
      checkInDate: effectiveCheckInDate,
      checkOutDate: effectiveCheckOutDate,
      hourlyRatePerHour: effectiveHourlyRatePerHour,
    });

    const booking = await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: {
          ...(body.bookingStatusId  !== undefined && { bookingStatusId:  body.bookingStatusId }),
          ...(body.roomId           !== undefined && { roomId:           body.roomId }),
          ...(body.checkInDate      !== undefined && { checkInDate:      effectiveCheckInDate }),
          ...(body.checkOutDate     !== undefined && { checkOutDate:     effectiveCheckOutDate }),
          ...(body.adults           !== undefined && { adults:           Number(body.adults) }),
          ...(body.children         !== undefined && { children:         Number(body.children) }),
          ...(body.baseRate         !== undefined && { baseRate:         effectiveBaseRate }),
          ...(body.chargeType       !== undefined && { chargeType:       body.chargeType }),
          ...(body.discountAmount   !== undefined && { discountAmount:   Number(body.discountAmount) }),
          ...(body.surchargeAmount  !== undefined && { surchargeAmount:  Number(body.surchargeAmount) }),
          ...(body.depositAmount    !== undefined && { depositAmount:    Number(body.depositAmount) }),
          ...(body.hourlyBlockHours  !== undefined && { hourlyBlockHours:  body.hourlyBlockHours != null ? Number(body.hourlyBlockHours) : null }),
          ...(body.hourlyRatePerHour !== undefined && { hourlyRatePerHour: effectiveHourlyRatePerHour }),
          ...(body.source            !== undefined && { source:            body.source }),
          ...(body.note              !== undefined && { note:              body.note }),
          totalAmount: effectiveTotalAmount,
        },
      });

      await syncInvoice(tx, id);

      const updated = await tx.booking.findUnique({
        where: { id },
        include: bookingInclude,
      });
      if (!updated) throw new Error("Updated booking not found");
      return updated;
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
        void writeAudit({
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

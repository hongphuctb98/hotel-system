import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, serverError } from "@/lib/response";

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

    return ok(booking);
  } catch (e) {
    return serverError(e);
  }
}

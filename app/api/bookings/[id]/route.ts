import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, serverError } from "@/lib/response";

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
    const booking = await prisma.booking.update({
      where: { id },
      data: {
        ...(body.bookingStatusId && { bookingStatusId: body.bookingStatusId }),
        ...(body.roomId && { roomId: body.roomId }),
        ...(body.checkInDate && { checkInDate: new Date(body.checkInDate) }),
        ...(body.checkOutDate && { checkOutDate: new Date(body.checkOutDate) }),
        ...(body.note !== undefined && { note: body.note }),
      },
      include: bookingInclude,
    });
    return ok(booking);
  } catch (e) {
    return serverError(e);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, serverError } from "@/lib/response";

export async function POST(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { services: true, invoices: true },
    });
    if (!booking) return notFound();

    // Find the "Checked-out" status
    const checkedOutStatus = await prisma.bookingStatus.findFirst({
      where: { code: "CHECKED_OUT" },
    });

    // Calculate totals
    const servicesTotal = booking.services.reduce(
      (sum: number, s: { totalPrice: unknown }) => sum + Number(s.totalPrice),
      0
    );
    const roomTotal = Number(booking.totalAmount);
    const subtotal = roomTotal + servicesTotal;
    const taxAmount = subtotal * 0.1;
    const totalAmount = subtotal + taxAmount;

    // Generate invoice if none exists
    let invoice = booking.invoices[0];
    if (!invoice) {
      invoice = await prisma.invoice.create({
        data: {
          bookingId: id,
          subtotal,
          taxAmount,
          discountAmount: 0,
          totalAmount,
        },
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        actualCheckOut: new Date(),
        ...(checkedOutStatus && { bookingStatusId: checkedOutStatus.id }),
      },
      include: { guest: true, bookingStatus: true },
    });

    return ok({ booking: updatedBooking, invoice });
  } catch (e) {
    return serverError(e);
  }
}

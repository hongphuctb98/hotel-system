import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, serverError } from "@/lib/response";

export async function POST(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { services: true, invoices: { include: { payments: true } }, bookingStatus: true },
    });
    if (!booking) return notFound();

    // ── Status guard — only CHECKED_IN bookings can be checked out ────────
    if (booking.bookingStatus.code !== "CHECKED_IN") {
      return badRequest(
        `Cannot check out: booking is currently '${booking.bookingStatus.code}'. Only CHECKED_IN bookings can be checked out.`
      );
    }

    // Find the "Checked-out" status
    const checkedOutStatus = await prisma.bookingStatus.findFirst({
      where: { code: "CHECKED_OUT" },
    });

    // ── Calculate final totals using stored discount/surcharge ────────────
    const servicesTotal  = booking.services.reduce(
      (sum: number, s: { totalPrice: unknown }) => sum + Number(s.totalPrice),
      0
    );
    const roomTotal      = Number(booking.totalAmount);
    const surcharge      = Number(booking.surchargeAmount ?? 0);
    const discount       = Number(booking.discountAmount  ?? 0);
    const subtotal       = roomTotal + servicesTotal + surcharge;
    const taxAmount      = subtotal * 0.1;
    const totalAmount    = subtotal + taxAmount - discount;

    // ── Create or update invoice ──────────────────────────────────────────
    // An invoice may already exist if a deposit payment was recorded at booking
    // creation. In that case, update it with final amounts (preserving payments).
    const existingInvoice = booking.invoices[0] ?? null;
    const paidSoFar = existingInvoice
      ? existingInvoice.payments.reduce((s, p) => s + Number(p.amount), 0)
      : 0;

    const invoice = existingInvoice
      ? await prisma.invoice.update({
          where: { id: existingInvoice.id },
          data: { subtotal, taxAmount, discountAmount: discount, totalAmount, isPaid: paidSoFar >= totalAmount },
        })
      : await prisma.invoice.create({
          data: { bookingId: id, subtotal, taxAmount, discountAmount: discount, totalAmount },
        });

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

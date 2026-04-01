import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, serverError } from "@/lib/response";

export async function POST(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    // Find the "Checked-in" booking status
    const checkedInStatus = await prisma.bookingStatus.findFirst({
      where: { code: "CHECKED_IN" },
    });

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        actualCheckIn: new Date(),
        ...(checkedInStatus && { bookingStatusId: checkedInStatus.id }),
      },
      include: {
        guest: true,
        room: { include: { roomStatus: true } },
        bookingStatus: true,
      },
    });

    if (!booking) return notFound();
    return ok(booking);
  } catch (e) {
    return serverError(e);
  }
}

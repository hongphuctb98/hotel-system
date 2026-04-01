import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, serverError } from "@/lib/response";

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const guest = await prisma.guest.findUnique({
      where: { id },
      include: {
        guestType: true,
        bookings: {
          include: { room: true, bookingStatus: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!guest) return notFound();
    return ok(guest);
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
    const guest = await prisma.guest.update({
      where: { id },
      data: {
        ...(body.guestTypeId && { guestTypeId: body.guestTypeId }),
        ...(body.firstName && { firstName: body.firstName }),
        ...(body.lastName && { lastName: body.lastName }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.note !== undefined && { note: body.note }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: { guestType: true },
    });
    return ok(guest);
  } catch (e) {
    return serverError(e);
  }
}

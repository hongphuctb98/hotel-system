import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, serverError } from "@/lib/response";

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return notFound();

    const services = await prisma.bookingService.findMany({
      where: { bookingId: id },
      include: { serviceItem: true },
      orderBy: { serviceDate: "desc" },
    });

    return ok(services);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await req.json();

    if (!body.serviceItemId || !body.quantity) {
      return badRequest("serviceItemId and quantity are required");
    }

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return notFound();

    const serviceItem = await prisma.serviceItem.findUnique({
      where: { id: body.serviceItemId },
    });
    if (!serviceItem) return badRequest("Service item not found");

    const unitPrice = body.unitPrice ?? Number(serviceItem.unitPrice);
    const quantity = Number(body.quantity);
    const totalPrice = unitPrice * quantity;

    const service = await prisma.bookingService.create({
      data: {
        bookingId: id,
        serviceItemId: body.serviceItemId,
        quantity,
        unitPrice,
        totalPrice,
        note: body.note ?? null,
        serviceDate: body.serviceDate ? new Date(body.serviceDate) : new Date(),
      },
      include: { serviceItem: true },
    });

    return ok(service);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const { serviceId } = await req.json();
    if (!serviceId) return badRequest("serviceId is required");

    const service = await prisma.bookingService.findFirst({
      where: { id: serviceId, bookingId: id },
    });
    if (!service) return notFound();

    await prisma.bookingService.delete({ where: { id: serviceId } });
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}

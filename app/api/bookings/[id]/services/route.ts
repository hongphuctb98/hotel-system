import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, serverError } from "@/lib/response";
import { TAX_RATE } from "@/common/constants/currency";

/**
 * Recalculate and persist invoice totals for a booking after its service list changes.
 * Reads the authoritative booking fields + current services to derive subtotal / tax / total.
 */
async function syncInvoice(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where:   { id: bookingId },
    include: { services: true, invoices: { include: { payments: true } } },
  });
  if (!booking || booking.invoices.length === 0) return;

  const invoice      = booking.invoices[0];
  const roomTotal    = Number(booking.totalAmount);
  const surcharge    = Number(booking.surchargeAmount   ?? 0);
  const discount     = Number(booking.discountAmount    ?? 0);
  const servicesTotal = booking.services.reduce((s, sv) => s + Number(sv.totalPrice), 0);

  const subtotal    = roomTotal + servicesTotal + surcharge;
  const taxAmount   = Math.round(subtotal * TAX_RATE);
  const totalAmount = subtotal + taxAmount - discount;
  const paidSoFar   = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);

  await prisma.invoice.update({
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

/**
 * PUT — full-sync replacement for a booking's service list.
 *
 * Accepts { services: [{ id?, serviceItemId, quantity }] }.
 * In one transaction it:
 *   1. Deletes rows whose IDs are no longer present in the submitted list.
 *   2. Updates rows whose IDs are present (quantity changed, item swapped, etc.).
 *   3. Inserts rows with no ID (newly added lines).
 *
 * Unit price is always resolved from the master ServiceItem record so that
 * the stored snapshot reflects the canonical price at save time.
 */
export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body   = await req.json();

    const booking = await prisma.booking.findUnique({ where: { id }, select: { id: true } });
    if (!booking) return notFound();

    type RowInput = { id?: string; serviceItemId: string; quantity: number };
    const rows: RowInput[] = (body.services ?? []).filter(
      (r: RowInput) => r?.serviceItemId && Number(r.quantity) > 0
    );

    // Validate that all supplied IDs actually belong to this booking
    const suppliedIds = rows.filter(r => r.id).map(r => r.id as string);
    if (suppliedIds.length > 0) {
      const owned = await prisma.bookingService.findMany({
        where: { id: { in: suppliedIds }, bookingId: id },
        select: { id: true },
      });
      if (owned.length !== suppliedIds.length)
        return badRequest("One or more service IDs do not belong to this booking");
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete rows no longer in the submitted list
      await tx.bookingService.deleteMany({
        where: { bookingId: id, id: { notIn: suppliedIds } },
      });

      // 2. Resolve service items in bulk for efficient price lookup
      const itemIds = [...new Set(rows.map(r => r.serviceItemId))];
      const items   = await tx.serviceItem.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, unitPrice: true },
      });
      const priceOf = Object.fromEntries(items.map(i => [i.id, Number(i.unitPrice)]));

      // 3. Upsert each row
      for (const row of rows) {
        const qty        = Math.max(1, Number(row.quantity));
        const unitPrice  = priceOf[row.serviceItemId] ?? 0;
        const totalPrice = qty * unitPrice;

        if (row.id) {
          await tx.bookingService.update({
            where: { id: row.id },
            data:  { serviceItemId: row.serviceItemId, quantity: qty, unitPrice, totalPrice },
          });
        } else {
          await tx.bookingService.create({
            data: { bookingId: id, serviceItemId: row.serviceItemId, quantity: qty, unitPrice, totalPrice },
          });
        }
      }
    });

    await syncInvoice(id);

    const updated = await prisma.bookingService.findMany({
      where:   { bookingId: id },
      include: { serviceItem: true },
      orderBy: { serviceDate: "asc" },
    });
    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

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

    await syncInvoice(id);

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
    await syncInvoice(id);
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, conflict, serverError } from "@/lib/response";
import { TAX_RATE } from "@/common/constants/currency";
import { getAuthUser } from "@/lib/auth";
import { StockMovementType, StockMovementReason } from "@/prisma/generated/client";

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

    const user = await getAuthUser();
    const createdById = user?.sub;

    await prisma.$transaction(async (tx) => {
      // Load existing rows before deletion (for stock reversal)
      const toDelete = await tx.bookingService.findMany({
        where: { bookingId: id, id: { notIn: suppliedIds } },
        include: { serviceItem: { select: { linkedProductId: true } } },
      });

      // 1. Delete rows no longer in the submitted list + reverse stock
      for (const row of toDelete) {
        await tx.bookingService.delete({ where: { id: row.id } });
        if (row.serviceItem?.linkedProductId && createdById) {
          const reversedQty = Math.abs(row.quantity);
          await tx.stockMovement.create({
            data: {
              productId: row.serviceItem.linkedProductId,
              type: StockMovementType.IN,
              quantity: reversedQty,
              reason: StockMovementReason.BOOKING_SERVICE,
              refType: "BookingService",
              refId: row.id,
              note: "Reversed: service sync removed",
              createdById,
            },
          });
          await tx.inventory.update({
            where: { productId: row.serviceItem.linkedProductId },
            data: { quantity: { increment: reversedQty } },
          });
        }
      }

      // 2. Resolve service items in bulk for efficient price + linkedProduct lookup
      const itemIds = [...new Set(rows.map(r => r.serviceItemId))];
      const items   = await tx.serviceItem.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, unitPrice: true, linkedProductId: true },
      });
      const itemOf = Object.fromEntries(items.map(i => [i.id, i]));

      // 3. Upsert each row with stock delta movements
      for (const row of rows) {
        const qty        = Math.max(1, Number(row.quantity));
        const item       = itemOf[row.serviceItemId];
        const unitPrice  = Number(item?.unitPrice ?? 0);
        const totalPrice = qty * unitPrice;

        if (row.id) {
          const existing = await tx.bookingService.findUnique({ where: { id: row.id }, select: { quantity: true } });
          const prevQty = existing?.quantity ?? 0;
          const delta = qty - prevQty;

          await tx.bookingService.update({
            where: { id: row.id },
            data:  { serviceItemId: row.serviceItemId, quantity: qty, unitPrice, totalPrice },
          });

          if (delta !== 0 && item?.linkedProductId && createdById) {
            const signedDelta = -delta; // OUT is negative
            if (signedDelta < 0) {
              const inv = await tx.inventory.findUnique({ where: { productId: item.linkedProductId } });
              if (inv && inv.quantity + signedDelta < 0) {
                throw Object.assign(new Error("INSUFFICIENT_STOCK"), { available: inv.quantity });
              }
            }
            await tx.stockMovement.create({
              data: {
                productId: item.linkedProductId,
                type: delta > 0 ? StockMovementType.OUT : StockMovementType.IN,
                quantity: signedDelta,
                reason: StockMovementReason.BOOKING_SERVICE,
                refType: "BookingService",
                refId: row.id,
                createdById,
              },
            });
            await tx.inventory.update({
              where: { productId: item.linkedProductId },
              data: { quantity: { increment: signedDelta } },
            });
          }
        } else {
          if (item?.linkedProductId && createdById) {
            const inv = await tx.inventory.findUnique({ where: { productId: item.linkedProductId } });
            if (inv && inv.quantity < qty) {
              throw Object.assign(new Error("INSUFFICIENT_STOCK"), { available: inv.quantity });
            }
          }

          const created = await tx.bookingService.create({
            data: { bookingId: id, serviceItemId: row.serviceItemId, quantity: qty, unitPrice, totalPrice },
          });

          if (item?.linkedProductId && createdById) {
            await tx.stockMovement.create({
              data: {
                productId: item.linkedProductId,
                type: StockMovementType.OUT,
                quantity: -qty,
                reason: StockMovementReason.BOOKING_SERVICE,
                refType: "BookingService",
                refId: created.id,
                createdById,
              },
            });
            await tx.inventory.update({
              where: { productId: item.linkedProductId },
              data: { quantity: { increment: -qty } },
            });
          }
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
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "INSUFFICIENT_STOCK") {
      const available = (e as Error & { available?: number }).available;
      return conflict("Insufficient stock", "INSUFFICIENT_STOCK", { available });
    }
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
      include: { linkedProduct: { include: { inventory: true } } },
    });
    if (!serviceItem) return badRequest("Service item not found");

    const unitPrice = body.unitPrice ?? Number(serviceItem.unitPrice);
    const quantity = Number(body.quantity);
    const totalPrice = unitPrice * quantity;

    // Check stock before creating if linked product exists
    if (serviceItem.linkedProductId && serviceItem.linkedProduct?.inventory) {
      const available = serviceItem.linkedProduct.inventory.quantity;
      if (available < quantity) {
        return conflict(
          `Insufficient stock. Only ${available} available.`,
          "INSUFFICIENT_STOCK",
          { available }
        );
      }
    }

    const user = await getAuthUser();
    const createdById = user?.sub;

    const service = await prisma.$transaction(async (tx) => {
      const svc = await tx.bookingService.create({
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

      if (serviceItem.linkedProductId && createdById) {
        await tx.stockMovement.create({
          data: {
            productId: serviceItem.linkedProductId,
            type: StockMovementType.OUT,
            quantity: -quantity,
            reason: StockMovementReason.BOOKING_SERVICE,
            refType: "BookingService",
            refId: svc.id,
            createdById,
          },
        });
        await tx.inventory.update({
          where: { productId: serviceItem.linkedProductId },
          data: { quantity: { increment: -quantity } },
        });
      }

      return svc;
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
      include: { serviceItem: { select: { linkedProductId: true } } },
    });
    if (!service) return notFound();

    const user = await getAuthUser();
    const createdById = user?.sub;

    await prisma.$transaction(async (tx) => {
      await tx.bookingService.delete({ where: { id: serviceId } });

      if (service.serviceItem?.linkedProductId && createdById) {
        const reversedQty = Math.abs(service.quantity);
        await tx.stockMovement.create({
          data: {
            productId: service.serviceItem.linkedProductId,
            type: StockMovementType.IN,
            quantity: reversedQty,
            reason: StockMovementReason.BOOKING_SERVICE,
            refType: "BookingService",
            refId: serviceId,
            note: "Reversed: booking service removed",
            createdById,
          },
        });
        await tx.inventory.update({
          where: { productId: service.serviceItem.linkedProductId },
          data: { quantity: { increment: reversedQty } },
        });
      }
    });

    await syncInvoice(id);
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}

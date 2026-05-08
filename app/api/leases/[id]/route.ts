import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, conflict, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";
import { findBookingConflict } from "@/lib/leaseValidation";

const leaseDetailInclude = {
  room: { include: { floor: true, roomType: true, roomStatus: true } },
  guest: true,
  bills: {
    orderBy: { billingMonth: "desc" as const },
    take: 12,
  },
};

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const lease = await prisma.leaseContract.findUnique({
      where: { id },
      include: leaseDetailInclude,
    });
    if (!lease) return notFound();

    const documents = await prisma.attachment.findMany({
      where: { entityType: "LEASE_CONTRACT", entityId: id },
      orderBy: { order: "asc" },
    });

    return ok({ ...lease, documents });
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
    const user = await requireAuth();
    const body = await req.json();

    const prev = await prisma.leaseContract.findUnique({ where: { id } });
    if (!prev) return notFound();

    // Validate dates when provided
    const startDate = body.startDate !== undefined ? new Date(body.startDate) : prev.startDate;
    const endDate =
      body.endDate !== undefined
        ? body.endDate
          ? new Date(body.endDate)
          : null
        : prev.endDate;

    if (body.startDate !== undefined && isNaN(startDate.getTime())) {
      return badRequest("Invalid start date", "VALIDATION_REQUIRED");
    }
    if (endDate !== null && isNaN(endDate.getTime())) {
      return badRequest("Invalid end date", "VALIDATION_REQUIRED");
    }
    if (endDate !== null && endDate <= startDate) {
      return conflict("Lease end date must be after start date", "LEASE_END_AFTER_START_REQUIRED");
    }

    // If dates changed and lease is still active/pending, check for booking conflicts
    const datesChanged = body.startDate !== undefined || body.endDate !== undefined;
    if (datesChanged && ["ACTIVE", "PENDING"].includes(prev.status)) {
      if (await findBookingConflict(prev.roomId, startDate, endDate)) {
        return conflict("This room has active bookings during the lease period", "ROOM_HAS_BOOKING");
      }
    }

    const updated = await prisma.leaseContract.update({
      where: { id },
      data: {
        ...(body.startDate !== undefined && { startDate }),
        ...(body.endDate !== undefined && { endDate }),
        ...(body.monthlyRent !== undefined && { monthlyRent: Number(body.monthlyRent) }),
        ...(body.depositAmount !== undefined && { depositAmount: Number(body.depositAmount) }),
        ...(body.depositPaid !== undefined && { depositPaid: body.depositPaid }),
        ...(body.paymentDueDay !== undefined && { paymentDueDay: Number(body.paymentDueDay) }),
        ...(body.occupants !== undefined && { occupants: Number(body.occupants) }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      include: leaseDetailInclude,
    });

    void writeAudit({
      action: "UPDATE",
      entityType: "LEASE_CONTRACT",
      entityId: id,
      userId: user.sub,
      oldValues: { startDate: prev.startDate, endDate: prev.endDate, monthlyRent: prev.monthlyRent, depositAmount: prev.depositAmount, paymentDueDay: prev.paymentDueDay, occupants: prev.occupants },
      newValues: { startDate: updated.startDate, endDate: updated.endDate, monthlyRent: updated.monthlyRent, depositAmount: updated.depositAmount, paymentDueDay: updated.paymentDueDay, occupants: updated.occupants },
    });

    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

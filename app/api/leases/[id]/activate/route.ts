import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, conflict, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";
import { findBookingConflict } from "@/lib/leaseValidation";

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const user = await requireAuth();

    const lease = await prisma.leaseContract.findUnique({
      where: { id },
      include: { room: true },
    });
    if (!lease) return notFound();

    if (lease.status === "ACTIVE") {
      return conflict("Lease is already active", "LEASE_ALREADY_ACTIVE");
    }

    // Validate lease dates
    const leaseStart = lease.startDate;
    const leaseEnd = lease.endDate;

    if (isNaN(leaseStart.getTime())) {
      return badRequest("Lease has an invalid start date", "VALIDATION_REQUIRED");
    }
    if (leaseEnd !== null) {
      if (isNaN(leaseEnd.getTime())) {
        return badRequest("Lease has an invalid end date", "VALIDATION_REQUIRED");
      }
      if (leaseEnd <= leaseStart) {
        return conflict("Lease end date must be after start date", "LEASE_END_AFTER_START_REQUIRED");
      }
      // Prevent activating a lease whose end date is already in the past
      if (leaseEnd <= new Date()) {
        return conflict("Cannot activate an expired lease", "LEASE_ALREADY_EXPIRED");
      }
    }

    // Check for active bookings overlapping the lease period
    if (await findBookingConflict(lease.roomId, leaseStart, leaseEnd)) {
      return conflict("This room has active bookings during the lease period", "ROOM_HAS_BOOKING");
    }

    const rentedLongTermStatus = await prisma.roomStatus.findFirst({
      where: { code: "RENTED_LONG_TERM" },
    });

    const updated = await prisma.$transaction(async (tx) => {
      const updatedLease = await tx.leaseContract.update({
        where: { id },
        data: { status: "ACTIVE" },
        include: {
          room: { include: { floor: true, roomType: true, roomStatus: true } },
          guest: true,
        },
      });

      if (rentedLongTermStatus) {
        await tx.room.update({
          where: { id: lease.roomId },
          data: { roomStatusId: rentedLongTermStatus.id },
        });
      }

      return updatedLease;
    });

    void writeAudit({
      action: "UPDATE",
      entityType: "LEASE_CONTRACT",
      entityId: id,
      userId: user.sub,
      oldValues: { status: "PENDING" },
      newValues: { status: "ACTIVE" },
    });

    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

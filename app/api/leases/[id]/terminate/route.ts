import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, conflict, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const user = await requireAuth();
    const body = await req.json();

    if (!body.terminationDate) return badRequest("Termination date is required", "VALIDATION_REQUIRED");

    const lease = await prisma.leaseContract.findUnique({
      where: { id },
      include: { room: { include: { roomStatus: true } } },
    });
    if (!lease) return notFound();

    // Block termination if any bill is not fully paid
    const unpaidBills = await prisma.tenantBill.findMany({
      where: {
        leaseId: id,
        status: { in: ["DRAFT", "PENDING", "PARTIAL"] },
      },
      select: { id: true, billingMonth: true, status: true, totalAmount: true, totalPaid: true },
    });

    if (unpaidBills.length > 0) {
      return conflict(
        "Cannot terminate lease with unpaid bills",
        "LEASE_HAS_UNPAID_BILLS",
        { unpaidBills }
      );
    }

    const availableStatus = await prisma.roomStatus.findFirst({
      where: { code: "AVAILABLE" },
    });

    const updated = await prisma.$transaction(async (tx) => {
      const updatedLease = await tx.leaseContract.update({
        where: { id },
        data: {
          status: "TERMINATED",
          terminationDate: new Date(body.terminationDate),
          terminationReason: body.terminationReason ?? null,
        },
        include: {
          room: { include: { floor: true, roomType: true, roomStatus: true } },
          guest: true,
        },
      });

      // Only revert room status if it is currently RENTED_LONG_TERM
      if (lease.room.roomStatus.code === "RENTED_LONG_TERM" && availableStatus) {
        await tx.room.update({
          where: { id: lease.roomId },
          data: { roomStatusId: availableStatus.id },
        });
      }

      return updatedLease;
    });

    void writeAudit({
      action: "UPDATE",
      entityType: "LEASE_CONTRACT",
      entityId: id,
      userId: user.sub,
      oldValues: { status: lease.status },
      newValues: { status: "TERMINATED", terminationDate: body.terminationDate },
    });

    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

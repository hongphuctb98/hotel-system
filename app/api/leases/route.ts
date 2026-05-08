import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, conflict, serverError } from "@/lib/response";
import { parseQueryParams } from "@/common/utils/queryParams";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";
import { findBookingConflict } from "@/lib/leaseValidation";

const leaseInclude = {
  room: { include: { floor: true, roomType: true, roomStatus: true } },
  guest: true,
};

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search } = parseQueryParams(req.nextUrl.searchParams);
    const skip = (page - 1) * limit;
    const sp = req.nextUrl.searchParams;

    const where: Record<string, unknown> = { isActive: true };
    if (sp.get("status")) where.status = sp.get("status");
    if (sp.get("roomId")) where.roomId = sp.get("roomId");
    if (sp.get("guestId")) where.guestId = sp.get("guestId");
    if (search) {
      where.guest = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      prisma.leaseContract.findMany({
        where,
        include: leaseInclude,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.leaseContract.count({ where }),
    ]);

    return ok(items, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    if (!body.roomId) return badRequest("Room is required", "VALIDATION_REQUIRED");
    if (!body.guestId) return badRequest("Guest is required", "VALIDATION_REQUIRED");
    if (!body.startDate) return badRequest("Start date is required", "VALIDATION_REQUIRED");
    if (body.monthlyRent == null) return badRequest("Monthly rent is required", "VALIDATION_REQUIRED");
    if (body.depositAmount == null) return badRequest("Deposit amount is required", "VALIDATION_REQUIRED");

    // Check for existing active/pending lease on this room
    const existingLease = await prisma.leaseContract.findFirst({
      where: {
        roomId: body.roomId,
        isActive: true,
        status: { in: ["PENDING", "ACTIVE"] },
      },
    });

    if (existingLease) {
      return conflict("This room already has an active or pending lease", "ROOM_HAS_ACTIVE_LEASE", { id: existingLease.id });
    }

    // Check for active bookings overlapping the lease period
    const leaseStart = new Date(body.startDate);
    const leaseEnd = body.endDate ? new Date(body.endDate) : null;

    if (await findBookingConflict(body.roomId, leaseStart, leaseEnd)) {
      return conflict("This room has active bookings during the lease period", "ROOM_HAS_BOOKING");
    }

    const lease = await prisma.leaseContract.create({
      data: {
        roomId: body.roomId,
        guestId: body.guestId,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        monthlyRent: Number(body.monthlyRent),
        depositAmount: Number(body.depositAmount),
        depositPaid: body.depositPaid ?? false,
        paymentDueDay: body.paymentDueDay ?? 10,
        occupants: body.occupants ? Number(body.occupants) : 1,
        notes: body.notes ?? null,
      },
      include: leaseInclude,
    });

    void writeAudit({
      action: "CREATE",
      entityType: "LEASE_CONTRACT",
      entityId: lease.id,
      userId: user.sub,
      newValues: { roomId: lease.roomId, guestId: lease.guestId, startDate: lease.startDate, monthlyRent: lease.monthlyRent },
    });

    return created(lease);
  } catch (e) {
    return serverError(e);
  }
}

import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { ok, created, forbidden, serverError } from "@/lib/response";
import { parseQueryParams } from "@/common/utils/queryParams";

const staffInclude = {
  user: { select: { email: true, role: true, isActive: true } },
  documents: { orderBy: { order: "asc" as const } },
};

type StaffWithRelations = {
  id: string;
  userId: string | null;
  name: string;
  avatarUrl: string | null;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  position: string | null;
  department: string | null;
  joinedAt: Date | null;
  resignedAt: Date | null;
  note: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: { email: string; role: string; isActive: boolean } | null;
  documents: {
    id: string;
    staffId: string;
    url: string;
    name: string;
    type: string;
    order: number;
    createdAt: Date;
  }[];
};

export function toStaffDTO(staff: StaffWithRelations) {
  return {
    id: staff.id,
    userId: staff.userId,
    hasAccount: staff.userId !== null,
    accountEmail: staff.user?.email ?? null,
    accountIsActive: staff.user?.isActive ?? null,
    role: staff.user?.role ?? null,
    name: staff.name,
    avatarUrl: staff.avatarUrl,
    contactEmail: staff.contactEmail,
    phone: staff.phone,
    address: staff.address,
    position: staff.position,
    department: staff.department,
    joinedAt: staff.joinedAt?.toISOString() ?? null,
    resignedAt: staff.resignedAt?.toISOString() ?? null,
    note: staff.note,
    isActive: staff.isActive,
    createdAt: staff.createdAt.toISOString(),
    updatedAt: staff.updatedAt.toISOString(),
    documents: staff.documents.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    })),
  };
}

export { staffInclude };

export async function GET(req: NextRequest) {
  try {
    const { page, limit } = parseQueryParams(req.nextUrl.searchParams);
    const showInactive = req.nextUrl.searchParams.get("showInactive") === "true";
    const role = req.nextUrl.searchParams.get("role");
    const hasAccountParam = req.nextUrl.searchParams.get("hasAccount");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (hasAccountParam === "true") where.userId = { not: null };
    else if (hasAccountParam === "false") where.userId = null;
    if (!showInactive) {
      const now = new Date();
      where.isActive = true;
      // A staff member is only considered inactive when resignedAt is in the past.
      // Null resignedAt or a future resignedAt keeps them in the active list.
      where.OR = [{ resignedAt: null }, { resignedAt: { gt: now } }];
    }
    // Role filter only applies to staff with accounts; staff without accounts are excluded
    if (role) where.user = { role };

    const [staffList, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        include: staffInclude,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.staff.count({ where }),
    ]);

    return ok(staffList.map(toStaffDTO), {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = await getAuthUser();
    if (!caller) return forbidden("Unauthorized");

    const body = await req.json();

    // Create Staff profile only — no User/account provisioning
    const id = randomUUID();
    const joinedAt = body.joinedAt ? new Date(body.joinedAt) : null;
    const resignedAt = body.resignedAt ? new Date(body.resignedAt) : null;

    const [createdStaff] = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "staffs" (
        "id",
        "userId",
        "name",
        "avatarUrl",
        "contactEmail",
        "phone",
        "address",
        "position",
        "department",
        "joinedAt",
        "resignedAt",
        "note",
        "isActive",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${id},
        NULL,
        ${body.name},
        NULL,
        ${body.contactEmail ?? null},
        ${body.phone ?? null},
        ${body.address ?? null},
        ${body.position ?? null},
        ${body.department ?? null},
        ${joinedAt},
        ${resignedAt},
        ${body.note ?? null},
        ${body.isActive ?? true},
        NOW(),
        NOW()
      )
      RETURNING "id"
    `;

    const staff = await prisma.staff.findUnique({
      where: { id: createdStaff.id },
      include: staffInclude,
    });

    if (!staff) {
      throw new Error("Created staff record could not be reloaded");
    }

    return created(toStaffDTO(staff));
  } catch (e) {
    return serverError(e);
  }
}

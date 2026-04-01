import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, serverError } from "@/lib/response";
import { parseQueryParams } from "@/common/utils/queryParams";

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, filters } = parseQueryParams(req.nextUrl.searchParams);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { isActive: true };
    if (filters.guestTypeId) where.guestTypeId = filters.guestTypeId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { idNumber: { contains: search } },
      ];
    }

    const [guests, total] = await Promise.all([
      prisma.guest.findMany({
        where,
        include: { guestType: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.guest.count({ where }),
    ]);

    return ok(guests, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const guest = await prisma.guest.create({
      data: {
        guestTypeId: body.guestTypeId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        idNumber: body.idNumber,
        nationality: body.nationality,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        address: body.address,
        note: body.note,
        tags: body.tags ?? [],
      },
      include: { guestType: true },
    });
    return created(guest);
  } catch (e) {
    return serverError(e);
  }
}

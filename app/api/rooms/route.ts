import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, serverError } from "@/lib/response";
import { parseQueryParams } from "@/common/utils/queryParams";

const roomInclude = {
  floor: true,
  roomType: true,
  roomStatus: true,
  amenities: { include: { amenity: true } },
};

export async function GET(req: NextRequest) {
  try {
    const { page, limit, filters } = parseQueryParams(req.nextUrl.searchParams);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { isActive: true };
    if (filters.floorId) where.floorId = filters.floorId;
    if (filters.roomTypeId) where.roomTypeId = filters.roomTypeId;
    if (filters.statusId) where.roomStatusId = filters.statusId;

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        include: roomInclude,
        skip,
        take: limit,
        orderBy: { number: "asc" },
      }),
      prisma.room.count({ where }),
    ]);

    return ok(rooms, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const room = await prisma.room.create({
      data: {
        number: body.number,
        floorId: body.floorId,
        roomTypeId: body.roomTypeId,
        roomStatusId: body.roomStatusId,
        note: body.note,
      },
      include: roomInclude,
    });
    return created(room);
  } catch (e) {
    return serverError(e);
  }
}

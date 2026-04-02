import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, conflict, serverError } from "@/lib/response";
import { parseQueryParams } from "@/common/utils/queryParams";

const roomInclude = {
  floor: true,
  roomType: true,
  roomStatus: true,
  amenities: { include: { amenity: true } },
  images: { orderBy: { order: "asc" as const } },
};

export async function GET(req: NextRequest) {
  try {
    const { page, limit, filters } = parseQueryParams(req.nextUrl.searchParams);
    const showInactive = req.nextUrl.searchParams.get("showInactive") === "true";
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (!showInactive) where.isActive = true;
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

    const existing = await prisma.room.findUnique({
      where: { number: body.number },
      select: { id: true, isActive: true },
    });
    if (existing) {
      if (!existing.isActive) {
        return conflict(
          "A room with this number already exists but is inactive.",
          "ROOM_INACTIVE_EXISTS",
          { id: existing.id }
        );
      }
      return conflict("A room with this number is already taken.", "ROOM_NUMBER_TAKEN");
    }

    const room = await prisma.room.create({
      data: {
        number: body.number,
        floorId: body.floorId,
        roomTypeId: body.roomTypeId,
        roomStatusId: body.roomStatusId,
        basePrice: body.basePrice != null ? body.basePrice : null,
        note: body.note,
      },
      include: roomInclude,
    });

    if (Array.isArray(body.amenityIds) && body.amenityIds.length > 0) {
      await prisma.roomAmenity.createMany({
        data: body.amenityIds.map((amenityId: string) => ({ roomId: room.id, amenityId })),
        skipDuplicates: true,
      });
    }

    const roomWithRelations = await prisma.room.findUnique({
      where: { id: room.id },
      include: roomInclude,
    });

    return created(roomWithRelations);
  } catch (e) {
    return serverError(e);
  }
}

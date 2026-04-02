import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, serverError } from "@/lib/response";

const roomInclude = {
  floor: true,
  roomType: true,
  roomStatus: true,
  amenities: { include: { amenity: true } },
  images: { orderBy: { order: "asc" as const } },
};

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const room = await prisma.room.findUnique({ where: { id }, include: roomInclude });
    if (!room) return notFound();
    return ok(room);
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
    const body = await req.json();

    const room = await prisma.$transaction(async (tx) => {
      const updated = await tx.room.update({
        where: { id },
        data: {
          ...(body.number && { number: body.number }),
          ...(body.floorId && { floorId: body.floorId }),
          ...(body.roomTypeId && { roomTypeId: body.roomTypeId }),
          ...(body.roomStatusId && { roomStatusId: body.roomStatusId }),
          ...(body.basePrice !== undefined && { basePrice: body.basePrice }),
          ...(body.note !== undefined && { note: body.note }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
        include: roomInclude,
      });

      if (body.amenityIds !== undefined) {
        await tx.roomAmenity.deleteMany({ where: { roomId: id } });
        if (Array.isArray(body.amenityIds) && body.amenityIds.length > 0) {
          await tx.roomAmenity.createMany({
            data: body.amenityIds.map((amenityId: string) => ({ roomId: id, amenityId })),
            skipDuplicates: true,
          });
        }
      }

      return tx.room.findUnique({ where: { id: updated.id }, include: roomInclude });
    });

    return ok(room);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    await prisma.room.update({ where: { id }, data: { isActive: false } });
    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}

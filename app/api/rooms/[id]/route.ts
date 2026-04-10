import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, serverError } from "@/lib/response";
import { buildBookingInclude, roomBaseInclude, toRoomDTO } from "../_utils";

function getRoomInclude(req: NextRequest) {
  const date =
    req.nextUrl.searchParams.get("date") ??
    new Date().toISOString().slice(0, 10);
  return { ...roomBaseInclude, ...buildBookingInclude(date) };
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const include = getRoomInclude(req);
    const room = await prisma.room.findUnique({ where: { id }, include });
    if (!room) return notFound();
    return ok(toRoomDTO(room));
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
    const include = getRoomInclude(req);

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
        include,
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

      return tx.room.findUnique({ where: { id: updated.id }, include });
    });

    return ok(toRoomDTO(room));
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

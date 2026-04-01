import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, serverError } from "@/lib/response";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const body = await req.json();
    const item = await prisma.floor.update({
      where: { id },
      data: { code: body.code, name: body.name, displayOrder: body.displayOrder, note: body.note, isActive: body.isActive },
    });
    return ok(item);
  } catch (e) { return serverError(e); }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const roomsUsing = await prisma.room.count({ where: { floorId: id } });
    if (roomsUsing > 0) {
      await prisma.floor.update({ where: { id }, data: { isActive: false } });
    } else {
      await prisma.floor.delete({ where: { id } });
    }
    return ok({ id });
  } catch (e) { return serverError(e); }
}

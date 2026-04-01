import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") ?? undefined;

    const tasks = await prisma.housekeepingTask.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });

    // Attach room info manually (no relation in schema for simplicity)
    const roomIds = [...new Set((tasks as { roomId: string }[]).map((t) => t.roomId))];
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds } },
      include: { floor: true },
    });
    const roomMap: Record<string, unknown> = Object.fromEntries(
      (rooms as { id: string }[]).map((r) => [r.id, r])
    );

    const enriched = (tasks as { roomId: string }[]).map((t) => ({ ...t, room: roomMap[t.roomId] }));

    return ok(enriched);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const task = await prisma.housekeepingTask.create({
      data: {
        roomId: body.roomId,
        type: body.type,
        status: "PENDING",
        assignedTo: body.assignedTo,
        note: body.note,
        dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      },
    });
    return created(task);
  } catch (e) {
    return serverError(e);
  }
}

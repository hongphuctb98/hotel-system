import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const entityType = sp.get("entityType") ?? undefined;
    const entityId   = sp.get("entityId")   ?? undefined;
    const roomId     = sp.get("roomId")     ?? undefined;
    const action     = sp.get("action")     ?? undefined;
    const dateFrom   = sp.get("dateFrom")   ?? undefined;
    const dateTo     = sp.get("dateTo")     ?? undefined;
    const search     = sp.get("search")     ?? undefined;
    const page       = Math.max(1, parseInt(sp.get("page")  ?? "1",  10));
    const limit      = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20", 10)));
    const skip       = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (entityType) where.entityType = entityType;
    if (entityId)   where.entityId   = entityId;
    if (roomId)     where.roomId     = roomId;
    if (action)     where.action     = action;
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999)) } : {}),
      };
    }
    if (search) {
      where.OR = [
        { entityId:   { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
        { action:     { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { user: { select: { id: true, email: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return ok(records, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    return serverError(e);
  }
}

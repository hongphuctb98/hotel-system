import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, serverError } from "@/lib/response";
import { parseQueryParams } from "@/common/utils/queryParams";

export async function GET(req: NextRequest) {
  try {
    const onlyActive = req.nextUrl.searchParams.get("active") === "true";
    const { page, limit } = parseQueryParams(req.nextUrl.searchParams);
    const skip = (page - 1) * limit;

    const where = onlyActive ? { isActive: true } : {};
    const [items, total] = await Promise.all([
      prisma.floor.findMany({ where, skip, take: limit, orderBy: { displayOrder: "asc" } }),
      prisma.floor.count({ where }),
    ]);
    return ok(items, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) { return serverError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.code || !body.name) return badRequest("code and name are required");
    const item = await prisma.floor.create({
      data: { code: body.code, name: body.name, displayOrder: body.displayOrder ?? 0, note: body.note },
    });
    return created(item);
  } catch (e) { return serverError(e); }
}

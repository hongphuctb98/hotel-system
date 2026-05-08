import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, conflict, serverError } from "@/lib/response";
import { parseQueryParams } from "@/common/utils/queryParams";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { page, limit } = parseQueryParams(req.nextUrl.searchParams);
    const showInactive = req.nextUrl.searchParams.get("showInactive") === "true";
    const type = req.nextUrl.searchParams.get("type") ?? undefined;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (!showInactive) where.isActive = true;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      prisma.longTermFeeItem.findMany({ where, skip, take: limit, orderBy: { code: "asc" } }),
      prisma.longTermFeeItem.count({ where }),
    ]);

    return ok(items, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { code, name, type, unit } = body;

    if (!code || !name || !type) return badRequest("code, name and type are required", "VALIDATION_REQUIRED");
    if (!["METERED", "FIXED"].includes(type)) return badRequest("type must be METERED or FIXED", "VALIDATION_REQUIRED");

    const normalizedCode = String(code).toUpperCase().replace(/\s+/g, "_");

    const existing = await prisma.longTermFeeItem.findUnique({ where: { code: normalizedCode } });
    if (existing) {
      return conflict("Fee item code already in use", "FEE_ITEM_CODE_TAKEN");
    }

    const item = await prisma.longTermFeeItem.create({
      data: { code: normalizedCode, name, type, unit: unit || null },
    });

    void writeAudit({ action: "CREATE", entityType: "LONG_TERM_FEE_ITEM", entityId: item.id, userId: user.sub, newValues: { code: item.code, name: item.name, type: item.type } });

    return created(item);
  } catch (e) {
    return serverError(e);
  }
}

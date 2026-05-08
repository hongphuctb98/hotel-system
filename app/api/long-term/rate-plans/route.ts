import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, serverError } from "@/lib/response";
import { parseQueryParams } from "@/common/utils/queryParams";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

const ratePlanInclude = {
  items: { include: { feeItem: true } },
};

export async function GET(req: NextRequest) {
  try {
    const { page, limit } = parseQueryParams(req.nextUrl.searchParams);
    const showInactive = req.nextUrl.searchParams.get("showInactive") === "true";
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (!showInactive) where.isActive = true;

    const [plans, total] = await Promise.all([
      prisma.longTermRatePlan.findMany({ where, skip, take: limit, orderBy: { effectiveFrom: "desc" }, include: ratePlanInclude }),
      prisma.longTermRatePlan.count({ where }),
    ]);

    return ok(plans, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { label, effectiveFrom, items } = body;

    if (!label || !effectiveFrom) return badRequest("label and effectiveFrom are required", "VALIDATION_REQUIRED");

    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.longTermRatePlan.create({
        data: { label, effectiveFrom: new Date(effectiveFrom) },
      });

      if (Array.isArray(items) && items.length > 0) {
        await tx.longTermRatePlanItem.createMany({
          data: items.map((item: { feeItemId: string; unitPrice: number }) => ({
            ratePlanId: created.id,
            feeItemId: item.feeItemId,
            unitPrice: item.unitPrice,
          })),
        });
      }

      return tx.longTermRatePlan.findUnique({ where: { id: created.id }, include: ratePlanInclude });
    });

    void writeAudit({ action: "CREATE", entityType: "LONG_TERM_RATE_PLAN", entityId: plan!.id, userId: user.sub, newValues: { label, effectiveFrom } });

    return created(plan);
  } catch (e) {
    return serverError(e);
  }
}

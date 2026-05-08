import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

const ratePlanInclude = {
  items: { include: { feeItem: true } },
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const plan = await prisma.longTermRatePlan.findUnique({ where: { id }, include: ratePlanInclude });
    if (!plan) return notFound();
    return ok(plan);
  } catch (e) {
    return serverError(e);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { label, effectiveFrom, isActive, items } = body;

    const existing = await prisma.longTermRatePlan.findUnique({ where: { id } });
    if (!existing) return notFound();

    const plan = await prisma.$transaction(async (tx) => {
      const updated = await tx.longTermRatePlan.update({
        where: { id },
        data: {
          ...(label !== undefined && { label }),
          ...(effectiveFrom !== undefined && { effectiveFrom: new Date(effectiveFrom) }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      if (Array.isArray(items)) {
        await tx.longTermRatePlanItem.deleteMany({ where: { ratePlanId: id } });
        if (items.length > 0) {
          await tx.longTermRatePlanItem.createMany({
            data: items.map((item: { feeItemId: string; unitPrice: number }) => ({
              ratePlanId: id,
              feeItemId: item.feeItemId,
              unitPrice: item.unitPrice,
            })),
          });
        }
      }

      return tx.longTermRatePlan.findUnique({ where: { id: updated.id }, include: ratePlanInclude });
    });

    void writeAudit({ action: "UPDATE", entityType: "LONG_TERM_RATE_PLAN", entityId: id, userId: user.sub, oldValues: { label: existing.label }, newValues: { label: plan!.label } });

    return ok(plan);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const existing = await prisma.longTermRatePlan.findUnique({ where: { id } });
    if (!existing) return notFound();

    const updated = await prisma.longTermRatePlan.update({
      where: { id },
      data: { isActive: false },
    });

    void writeAudit({ action: "DELETE", entityType: "LONG_TERM_RATE_PLAN", entityId: id, userId: user.sub, oldValues: { isActive: true }, newValues: { isActive: false } });

    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, conflict, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { name, unit, isActive } = body;

    const existing = await prisma.longTermFeeItem.findUnique({ where: { id } });
    if (!existing) return notFound();

    const updated = await prisma.longTermFeeItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(unit !== undefined && { unit: unit || null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    void writeAudit({ action: "UPDATE", entityType: "LONG_TERM_FEE_ITEM", entityId: id, userId: user.sub, oldValues: { name: existing.name, unit: existing.unit, isActive: existing.isActive }, newValues: { name: updated.name, unit: updated.unit, isActive: updated.isActive } });

    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const existing = await prisma.longTermFeeItem.findUnique({ where: { id } });
    if (!existing) return notFound();

    const inUse = await prisma.longTermRatePlanItem.findFirst({
      where: { feeItemId: id, ratePlan: { isActive: true } },
    });
    if (inUse) return conflict("Fee item is referenced by an active rate plan", "FEE_ITEM_IN_USE");

    const updated = await prisma.longTermFeeItem.update({
      where: { id },
      data: { isActive: false },
    });

    void writeAudit({ action: "DELETE", entityType: "LONG_TERM_FEE_ITEM", entityId: id, userId: user.sub, oldValues: { isActive: true }, newValues: { isActive: false } });

    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

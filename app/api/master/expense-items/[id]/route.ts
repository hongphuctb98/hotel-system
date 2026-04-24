import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, conflict, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";

const ITEM_INCLUDE = {
  category: { select: { id: true, name: true } },
  defaultPaymentMethod: { select: { id: true, name: true } },
} as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.expenseItem.findUnique({ where: { id } });
    if (!existing) return notFound();

    const categoryId = body.categoryId ?? existing.categoryId;
    const name = body.name?.trim() ?? existing.name;

    if (name !== existing.name || categoryId !== existing.categoryId) {
      const duplicate = await prisma.expenseItem.findFirst({
        where: { categoryId, name, NOT: { id } },
      });
      if (duplicate) {
        return conflict("An item with this name already exists in this category", "EXPENSE_ITEM_NAME_TAKEN");
      }
    }

    const updated = await prisma.expenseItem.update({
      where: { id },
      data: {
        ...(body.name?.trim() ? { name: body.name.trim() } : {}),
        ...(body.categoryId ? { categoryId: body.categoryId } : {}),
        ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.isRecurring !== undefined ? { isRecurring: body.isRecurring } : {}),
        ...(body.defaultVendor !== undefined ? { defaultVendor: body.defaultVendor?.trim() || null } : {}),
        ...(body.defaultAmount !== undefined ? { defaultAmount: body.defaultAmount ?? null } : {}),
        ...(body.defaultPaymentMethodId !== undefined ? { defaultPaymentMethodId: body.defaultPaymentMethodId || null } : {}),
      },
      include: ITEM_INCLUDE,
    });
    void writeAudit({ action: "UPDATE", entityType: "EXPENSE_ITEM", entityId: id, oldValues: { name: existing.name, categoryId: existing.categoryId, isRecurring: existing.isRecurring, isActive: existing.isActive }, newValues: { name: updated.name, categoryId: updated.categoryId, isRecurring: updated.isRecurring, isActive: updated.isActive } });
    return ok(updated);
  } catch (e) { return serverError(e); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.expenseItem.findUnique({ where: { id } });
    if (!existing) return notFound();

    const lineCount = await prisma.serviceExpenseLine.count({ where: { expenseItemId: id } });
    if (lineCount > 0) {
      return conflict("Cannot delete: this item is referenced by expense document lines", "EXPENSE_ITEM_IN_USE");
    }

    const deleted = await prisma.expenseItem.update({ where: { id }, data: { isActive: false } });
    void writeAudit({ action: "DELETE", entityType: "EXPENSE_ITEM", entityId: id, oldValues: { name: existing.name, isActive: true }, newValues: { isActive: false } });
    return ok(deleted);
  } catch (e) { return serverError(e); }
}

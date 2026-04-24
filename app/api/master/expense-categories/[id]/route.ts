import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, notFound, conflict, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.expenseCategory.findUnique({ where: { id } });
    if (!existing) return notFound();

    if (body.name?.trim() && body.name.trim() !== existing.name) {
      const duplicate = await prisma.expenseCategory.findUnique({ where: { name: body.name.trim() } });
      if (duplicate && duplicate.id !== id) {
        return conflict("A category with this name already exists", "EXPENSE_CATEGORY_NAME_TAKEN");
      }
    }

    const updated = await prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(body.name?.trim() ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });
    void writeAudit({ action: "UPDATE", entityType: "EXPENSE_CATEGORY", entityId: id, oldValues: { name: existing.name, description: existing.description, isActive: existing.isActive }, newValues: { name: updated.name, description: updated.description, isActive: updated.isActive } });
    return ok(updated);
  } catch (e) { return serverError(e); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.expenseCategory.findUnique({ where: { id } });
    if (!existing) return notFound();

    const childCount = await prisma.expenseItem.count({ where: { categoryId: id } });
    if (childCount > 0) {
      return conflict("Cannot delete: this category has associated expense items", "EXPENSE_CATEGORY_HAS_ITEMS");
    }

    const deleted = await prisma.expenseCategory.update({ where: { id }, data: { isActive: false } });
    void writeAudit({ action: "DELETE", entityType: "EXPENSE_CATEGORY", entityId: id, oldValues: { name: existing.name, isActive: true }, newValues: { isActive: false } });
    return ok(deleted);
  } catch (e) { return serverError(e); }
}

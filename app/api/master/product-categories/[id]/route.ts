import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, conflict, notFound, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const body = await req.json();

    if (body.name) {
      const duplicate = await prisma.productCategory.findUnique({ where: { name: body.name.trim() } });
      if (duplicate && duplicate.id !== id) {
        if (!duplicate.isActive) {
          return conflict("An inactive category with this name already exists", "PRODUCT_CATEGORY_INACTIVE_EXISTS", { id: duplicate.id });
        }
        return conflict("A category with this name already exists", "PRODUCT_CATEGORY_NAME_TAKEN");
      }
    }

    const existing = await prisma.productCategory.findUnique({ where: { id } });
    if (!existing) return notFound();

    const item = await prisma.productCategory.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    void writeAudit({ action: "UPDATE", entityType: "PRODUCT_CATEGORY", entityId: id, oldValues: { name: existing.name, isActive: existing.isActive }, newValues: { name: item.name, isActive: item.isActive } });
    return ok(item);
  } catch (e) { return serverError(e); }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;

    const hasProducts = await prisma.product.findFirst({ where: { categoryId: id, isActive: true } });
    if (hasProducts) {
      return conflict("Cannot delete: this category has active products", "PRODUCT_CATEGORY_HAS_PRODUCTS");
    }

    const item = await prisma.productCategory.findUnique({ where: { id } });
    if (!item) return notFound();

    await prisma.productCategory.update({ where: { id }, data: { isActive: false } });
    void writeAudit({ action: "DELETE", entityType: "PRODUCT_CATEGORY", entityId: id, oldValues: { name: item.name, isActive: true }, newValues: { isActive: false } });
    return ok({ id });
  } catch (e) { return serverError(e); }
}

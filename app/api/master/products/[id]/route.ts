import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, conflict, notFound, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventory: true,
        linkedServiceItem: { select: { id: true, name: true, code: true } },
      },
    });
    if (!product) return notFound();
    return ok(product);
  } catch (e) { return serverError(e); }
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const body = await req.json();

    if (body.sku !== undefined && body.sku !== null && body.sku !== "") {
      const existingSku = await prisma.product.findUnique({ where: { sku: body.sku.trim() } });
      if (existingSku && existingSku.id !== id) {
        if (!existingSku.isActive) {
          return conflict("A product with this SKU already exists but is inactive", "PRODUCT_SKU_INACTIVE_EXISTS", { id: existingSku.id });
        }
        return conflict("A product with this SKU already exists", "PRODUCT_SKU_TAKEN");
      }
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return notFound();

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.sku !== undefined && { sku: body.sku?.trim() || null }),
        ...(body.unit !== undefined && { unit: body.unit.trim() }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: {
        category: true,
        inventory: true,
        linkedServiceItem: { select: { id: true, name: true, code: true } },
      },
    });
    void writeAudit({ action: "UPDATE", entityType: "PRODUCT", entityId: id, oldValues: { name: existing.name, sku: existing.sku, unit: existing.unit, categoryId: existing.categoryId, isActive: existing.isActive }, newValues: { name: product.name, sku: product.sku, unit: product.unit, categoryId: product.categoryId, isActive: product.isActive } });
    return ok(product);
  } catch (e) { return serverError(e); }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return notFound();
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    void writeAudit({ action: "DELETE", entityType: "PRODUCT", entityId: id, oldValues: { name: product.name, isActive: true }, newValues: { isActive: false } });
    return ok({ id });
  } catch (e) { return serverError(e); }
}

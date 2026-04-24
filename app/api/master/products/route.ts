import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, conflict, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const isActiveParam = searchParams.get("isActive");

    const where: Record<string, unknown> = {};
    if (categoryId) where.categoryId = categoryId;
    if (isActiveParam !== null) where.isActive = isActiveParam === "true";

    const items = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        category: true,
        inventory: true,
        linkedServiceItem: { select: { id: true, name: true, code: true } },
      },
    });
    return ok(items);
  } catch (e) { return serverError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return badRequest("name required");
    if (!body.unit?.trim()) return badRequest("unit required");

    if (body.sku) {
      const existingSku = await prisma.product.findUnique({ where: { sku: body.sku.trim() } });
      if (existingSku) {
        if (!existingSku.isActive) {
          return conflict("A product with this SKU already exists but is inactive", "PRODUCT_SKU_INACTIVE_EXISTS", { id: existingSku.id });
        }
        return conflict("A product with this SKU already exists", "PRODUCT_SKU_TAKEN");
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: body.name.trim(),
          sku: body.sku?.trim() || null,
          unit: body.unit.trim(),
          categoryId: body.categoryId || null,
        },
        include: { category: true, inventory: true, linkedServiceItem: { select: { id: true, name: true, code: true } } },
      });
      await tx.inventory.create({
        data: { productId: created.id, quantity: 0, reorderLevel: 0 },
      });
      return created;
    });

    void writeAudit({ action: "CREATE", entityType: "PRODUCT", entityId: product.id, newValues: { name: product.name, sku: product.sku, unit: product.unit, categoryId: product.categoryId } });
    return created(product);
  } catch (e) { return serverError(e); }
}

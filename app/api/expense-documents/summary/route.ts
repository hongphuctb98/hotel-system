import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/response";

function parseMonthStart(yyyyMM: string): Date {
  const [year, month] = yyyyMM.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startMonth = searchParams.get("startMonth");
    const endMonth = searchParams.get("endMonth");

    if (!startMonth || !endMonth) return badRequest("startMonth and endMonth are required (YYYY-MM)");

    const startDate = parseMonthStart(startMonth);
    const endDateObj = parseMonthStart(endMonth);
    const endDate = new Date(Date.UTC(endDateObj.getUTCFullYear(), endDateObj.getUTCMonth() + 1, 1));

    const accountingMonthFilter = { gte: startDate, lt: endDate };

    // SERVICE totals
    const serviceLines = await prisma.serviceExpenseLine.findMany({
      where: {
        document: { isActive: true, type: "SERVICE", accountingMonth: accountingMonthFilter },
      },
      include: {
        expenseItem: { include: { category: { select: { id: true, name: true } } } },
      },
    });

    // INVENTORY + INVENTORY_ADJUSTMENT totals (via document totalAmount, signed)
    const inventoryLines = await prisma.inventoryReceiptLine.findMany({
      where: {
        document: {
          isActive: true,
          type: { in: ["INVENTORY", "INVENTORY_ADJUSTMENT"] },
          accountingMonth: accountingMonthFilter,
        },
      },
      include: {
        product: { include: { category: { select: { id: true, name: true } } } },
      },
    });

    // Build service breakdown: category → items
    const serviceCategoryMap: Map<string, { id: string; name: string; total: number; items: Map<string, { id: string; name: string; total: number }> }> = new Map();
    let totalService = 0;

    for (const line of serviceLines) {
      const cat = line.expenseItem.category;
      const item = line.expenseItem;
      totalService += line.amount;

      if (!serviceCategoryMap.has(cat.id)) {
        serviceCategoryMap.set(cat.id, { id: cat.id, name: cat.name, total: 0, items: new Map() });
      }
      const catEntry = serviceCategoryMap.get(cat.id)!;
      catEntry.total += line.amount;

      if (!catEntry.items.has(item.id)) {
        catEntry.items.set(item.id, { id: item.id, name: item.name, total: 0 });
      }
      catEntry.items.get(item.id)!.total += line.amount;
    }

    // Build inventory breakdown: ProductCategory → Product (signed)
    const inventoryCategoryMap: Map<string, { id: string; name: string; total: number; products: Map<string, { id: string; name: string; unit: string; total: number; totalQuantity: number }> }> = new Map();
    let totalInventory = 0;

    for (const line of inventoryLines) {
      const cat = line.product.category;
      if (!cat) continue;
      const product = line.product;
      const lineTotal = Number(line.lineTotal);
      const lineQty = Number(line.quantity);
      totalInventory += lineTotal;

      if (!inventoryCategoryMap.has(cat.id)) {
        inventoryCategoryMap.set(cat.id, { id: cat.id, name: cat.name, total: 0, products: new Map() });
      }
      const catEntry = inventoryCategoryMap.get(cat.id)!;
      catEntry.total += lineTotal;

      if (!catEntry.products.has(product.id)) {
        catEntry.products.set(product.id, { id: product.id, name: product.name, unit: product.unit, total: 0, totalQuantity: 0 });
      }
      const prodEntry = catEntry.products.get(product.id)!;
      prodEntry.total += lineTotal;
      prodEntry.totalQuantity += lineQty;
    }

    const serviceCategories = Array.from(serviceCategoryMap.values()).map((c) => ({
      id: c.id,
      name: c.name,
      total: c.total,
      items: Array.from(c.items.values()),
    }));

    const inventoryCategories = Array.from(inventoryCategoryMap.values()).map((c) => ({
      id: c.id,
      name: c.name,
      total: c.total,
      products: Array.from(c.products.values()).map((p) => ({
        ...p,
        totalQuantity: p.totalQuantity.toFixed(3),
      })),
    }));

    return ok({
      totalService,
      totalInventory,
      total: totalService + totalInventory,
      service: { categories: serviceCategories },
      inventory: { categories: inventoryCategories },
    });
  } catch (e) { return serverError(e); }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, conflict, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";

const ITEM_INCLUDE = {
  category: { select: { id: true, name: true } },
  defaultPaymentMethod: { select: { id: true, name: true } },
} as const;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId") || undefined;
    const isActiveParam = searchParams.get("isActive");
    const isRecurringParam = searchParams.get("isRecurring");

    const where: Record<string, unknown> = {};
    if (categoryId) where.categoryId = categoryId;
    if (isActiveParam !== null) where.isActive = isActiveParam === "true";
    if (isRecurringParam !== null) where.isRecurring = isRecurringParam === "true";

    const items = await prisma.expenseItem.findMany({
      where,
      include: ITEM_INCLUDE,
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    });
    return ok(items);
  } catch (e) { return serverError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return badRequest("name required");
    if (!body.categoryId) return badRequest("categoryId required");

    const category = await prisma.expenseCategory.findUnique({ where: { id: body.categoryId } });
    if (!category) return badRequest("Category not found");
    if (!category.isActive) return badRequest("Parent category is inactive");

    const existing = await prisma.expenseItem.findFirst({
      where: { categoryId: body.categoryId, name: body.name.trim() },
    });
    if (existing) {
      if (!existing.isActive) {
        return conflict("An inactive item with this name already exists in this category", "EXPENSE_ITEM_INACTIVE_EXISTS", { id: existing.id });
      }
      return conflict("An item with this name already exists in this category", "EXPENSE_ITEM_NAME_TAKEN");
    }

    const item = await prisma.expenseItem.create({
      data: {
        categoryId: body.categoryId,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        isRecurring: body.isRecurring ?? false,
        defaultVendor: body.defaultVendor?.trim() || null,
        defaultAmount: body.defaultAmount ?? null,
        defaultPaymentMethodId: body.defaultPaymentMethodId || null,
      },
      include: ITEM_INCLUDE,
    });
    void writeAudit({ action: "CREATE", entityType: "EXPENSE_ITEM", entityId: item.id, newValues: { name: item.name, categoryId: item.categoryId, isRecurring: item.isRecurring } });
    return created(item);
  } catch (e) { return serverError(e); }
}

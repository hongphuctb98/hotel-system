import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, conflict, serverError } from "@/lib/response";
import { getAuthUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { StockMovementType, StockMovementReason, ExpenseDocumentType } from "@/prisma/generated/client";

function parseAccountingMonth(yyyyMM: string): Date {
  const [year, month] = yyyyMM.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

async function computeServiceTotal(lines: { amount: number }[]) {
  return lines.reduce((sum, l) => sum + l.amount, 0);
}

async function computeInventoryTotal(lines: { quantity: number; unitPrice: number }[]) {
  return lines.reduce((sum, l) => sum + Math.round(l.quantity * l.unitPrice), 0);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as ExpenseDocumentType | null;
    const accountingMonthStr = searchParams.get("accountingMonth");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const categoryId = searchParams.get("categoryId");
    const vendorName = searchParams.get("vendorName");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { isActive: true };
    if (type) where.type = type;
    if (accountingMonthStr) {
      const monthStart = parseAccountingMonth(accountingMonthStr);
      const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
      where.accountingMonth = { gte: monthStart, lt: monthEnd };
    }
    if (startDate) where.documentDate = { ...(where.documentDate as object || {}), gte: new Date(startDate) };
    if (endDate) where.documentDate = { ...(where.documentDate as object || {}), lte: new Date(endDate) };
    if (vendorName) where.vendorName = { contains: vendorName, mode: "insensitive" };
    if (categoryId) {
      where.serviceLines = { some: { expenseItem: { categoryId } } };
    }

    const [items, total] = await Promise.all([
      prisma.expenseDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { documentDate: "desc" },
        select: {
          id: true,
          type: true,
          documentDate: true,
          accountingMonth: true,
          vendorName: true,
          totalAmount: true,
          isPaid: true,
          isActive: true,
          createdAt: true,
          paymentMethod: { select: { id: true, name: true } },
          _count: { select: { serviceLines: true, inventoryLines: true } },
          serviceLines: { select: { expenseItem: { select: { name: true } } } },
          inventoryLines: { select: { product: { select: { name: true } } } },
        },
      }),
      prisma.expenseDocument.count({ where }),
    ]);

    const data = items.map((d) => ({
      ...d,
      lineCount: d._count.serviceLines + d._count.inventoryLines,
      itemNames: d.type === "SERVICE"
        ? d.serviceLines.map((l) => l.expenseItem.name)
        : d.inventoryLines.map((l) => l.product.name),
      _count: undefined,
      serviceLines: undefined,
      inventoryLines: undefined,
    }));

    return ok(data, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) { return serverError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return badRequest("Unauthorized");

    const body = await req.json();
    const { type, documentDate, accountingMonth: accountingMonthStr, vendorName, paymentMethodId, referenceNumber, note, isPaid, paidAt, lines } = body;

    if (!type || !["SERVICE", "INVENTORY", "INVENTORY_ADJUSTMENT"].includes(type)) {
      return badRequest("Invalid type");
    }
    if (!documentDate) return badRequest("documentDate required");
    if (!accountingMonthStr) return badRequest("accountingMonth required");
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return badRequest("At least one line is required");
    }

    const accountingMonth = parseAccountingMonth(accountingMonthStr);

    if (type === "SERVICE") {
      for (const line of lines) {
        if (!line.expenseItemId) return badRequest("expenseItemId required on each service line");
        if (!line.amount || line.amount <= 0) return badRequest("amount must be > 0 on each service line");
        const item = await prisma.expenseItem.findUnique({ where: { id: line.expenseItemId } });
        if (!item || !item.isActive) return badRequest(`Expense item ${line.expenseItemId} is inactive or not found`);
      }
      const totalAmount = await computeServiceTotal(lines);

      const doc = await prisma.expenseDocument.create({
        data: {
          type: "SERVICE",
          documentDate: new Date(documentDate),
          accountingMonth,
          vendorName: vendorName?.trim() || null,
          ...(paymentMethodId ? { paymentMethod: { connect: { id: paymentMethodId } } } : {}),
          referenceNumber: referenceNumber?.trim() || null,
          note: note?.trim() || null,
          isPaid: isPaid ?? false,
          paidAt: isPaid && paidAt ? new Date(paidAt) : null,
          totalAmount,
          serviceLines: {
            create: lines.map((l: { expenseItemId: string; amount: number }) => ({
              expenseItemId: l.expenseItemId,
              amount: l.amount,
            })),
          },
        },
        include: { serviceLines: true },
      });
      void writeAudit({ action: "CREATE", entityType: "EXPENSE_DOCUMENT", entityId: doc.id, userId: user.sub, newValues: { type: doc.type, totalAmount: doc.totalAmount, accountingMonth: doc.accountingMonth } });
      return created(doc);
    }

    // INVENTORY or INVENTORY_ADJUSTMENT
    for (const line of lines) {
      if (!line.productId) return badRequest("productId required on each inventory line");
      const product = await prisma.product.findUnique({ where: { id: line.productId } });
      if (!product || !product.isActive) return badRequest(`Product ${line.productId} is inactive or not found`);

      if (type === "INVENTORY") {
        if (!line.quantity || line.quantity <= 0) return badRequest("quantity must be > 0 on INVENTORY lines");
        if (!line.unitPrice || line.unitPrice <= 0) return badRequest("unitPrice must be > 0 on INVENTORY lines");
      } else {
        if (!line.quantity || line.quantity === 0) return badRequest("quantity must be non-zero on INVENTORY_ADJUSTMENT lines");
        if (line.unitPrice === undefined || line.unitPrice < 0) return badRequest("unitPrice must be >= 0 on INVENTORY_ADJUSTMENT lines");
      }
    }

    // For INVENTORY_ADJUSTMENT, check stock won't go negative
    if (type === "INVENTORY_ADJUSTMENT") {
      for (const line of lines) {
        if (line.quantity < 0) {
          const inv = await prisma.inventory.findUnique({ where: { productId: line.productId } });
          if (!inv || inv.quantity + line.quantity < 0) {
            return conflict("Insufficient stock for adjustment", "INSUFFICIENT_STOCK");
          }
        }
      }
    }

    const totalAmount = await computeInventoryTotal(lines);

    const doc = await prisma.$transaction(async (tx) => {
      const newDoc = await tx.expenseDocument.create({
        data: {
          type: type as ExpenseDocumentType,
          documentDate: new Date(documentDate),
          accountingMonth,
          vendorName: vendorName?.trim() || null,
          ...(paymentMethodId ? { paymentMethod: { connect: { id: paymentMethodId } } } : {}),
          referenceNumber: referenceNumber?.trim() || null,
          note: note?.trim() || null,
          isPaid: isPaid ?? false,
          paidAt: isPaid && paidAt ? new Date(paidAt) : null,
          totalAmount,
          inventoryLines: {
            create: lines.map((l: { productId: string; quantity: number; unitPrice: number }) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              lineTotal: Math.round(l.quantity * l.unitPrice),
            })),
          },
        },
        include: { inventoryLines: true },
      });

      const movementType: StockMovementType = type === "INVENTORY" ? "IN" : "ADJUST";
      const movementReason: StockMovementReason = type === "INVENTORY" ? "PURCHASE" : "STOCKTAKE";

      for (const line of lines) {
        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            type: movementType,
            quantity: line.quantity,
            reason: movementReason,
            refType: "EXPENSE_DOCUMENT",
            refId: newDoc.id,
            createdById: user.sub,
          },
        });
        await tx.inventory.update({
          where: { productId: line.productId },
          data: { quantity: { increment: line.quantity } },
        });
      }

      return newDoc;
    });

    void writeAudit({ action: "CREATE", entityType: "EXPENSE_DOCUMENT", entityId: doc.id, userId: user.sub, newValues: { type: doc.type, totalAmount: doc.totalAmount, accountingMonth: doc.accountingMonth } });
    return created(doc);
  } catch (e) { return serverError(e); }
}

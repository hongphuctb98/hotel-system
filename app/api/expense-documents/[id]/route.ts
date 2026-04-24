import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, notFound, conflict, serverError } from "@/lib/response";
import { getAuthUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { StockMovementType, StockMovementReason } from "@/prisma/generated/client";

function parseAccountingMonth(yyyyMM: string): Date {
  const [year, month] = yyyyMM.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

const DOC_INCLUDE = {
  paymentMethod: { select: { id: true, name: true } },
  serviceLines: {
    include: { expenseItem: { include: { category: { select: { id: true, name: true } } } } },
  },
  inventoryLines: {
    include: { product: { select: { id: true, name: true, unit: true, category: { select: { id: true, name: true } } } } },
  },
  attachments: {
    select: { id: true, url: true, name: true },
    orderBy: { order: "asc" as const },
  },
} as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const doc = await prisma.expenseDocument.findUnique({ where: { id }, include: DOC_INCLUDE });
    if (!doc) return notFound();
    return ok(doc);
  } catch (e) { return serverError(e); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) return badRequest("Unauthorized");

    const existing = await prisma.expenseDocument.findUnique({
      where: { id },
      include: { inventoryLines: true, serviceLines: true },
    });
    if (!existing || !existing.isActive) return notFound();

    if (existing.type === "INVENTORY_ADJUSTMENT") {
      return conflict("Inventory adjustment documents cannot be edited", "ADJUSTMENT_IMMUTABLE");
    }

    const body = await req.json();
    if (body.type && body.type !== existing.type) {
      return badRequest("Document type cannot be changed after creation");
    }

    const { documentDate, accountingMonth: accountingMonthStr, vendorName, paymentMethodId, referenceNumber, note, isPaid, paidAt, lines } = body;
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return badRequest("At least one line is required");
    }

    const accountingMonth = accountingMonthStr ? parseAccountingMonth(accountingMonthStr) : existing.accountingMonth;

    if (existing.type === "SERVICE") {
      if (lines.some((l: { expenseItemId: string }) => !l.expenseItemId)) return badRequest("expenseItemId required on each service line");
      if (lines.some((l: { amount: number }) => !l.amount || l.amount <= 0)) return badRequest("amount must be > 0 on each service line");

      const expenseItemIds: string[] = lines.map((l: { expenseItemId: string }) => l.expenseItemId);
      const expenseItems = await prisma.expenseItem.findMany({
        where: { id: { in: expenseItemIds } },
        select: { id: true, isActive: true },
      });
      const expenseItemMap = new Map(expenseItems.map((i) => [i.id, i]));
      for (const eid of expenseItemIds) {
        const item = expenseItemMap.get(eid);
        if (!item || !item.isActive) return badRequest(`Expense item ${eid} is inactive`);
      }

      const totalAmount = lines.reduce((s: number, l: { amount: number }) => s + l.amount, 0);

      const doc = await prisma.$transaction(async (tx) => {
        await tx.serviceExpenseLine.deleteMany({ where: { documentId: id } });
        return tx.expenseDocument.update({
          where: { id },
          data: {
            ...(documentDate ? { documentDate: new Date(documentDate) } : {}),
            accountingMonth,
            vendorName: vendorName !== undefined ? (vendorName?.trim() || null) : existing.vendorName,
            ...(paymentMethodId !== undefined
              ? { paymentMethod: paymentMethodId ? { connect: { id: paymentMethodId } } : { disconnect: true } }
              : {}),
            referenceNumber: referenceNumber !== undefined ? (referenceNumber?.trim() || null) : existing.referenceNumber,
            note: note !== undefined ? (note?.trim() || null) : existing.note,
            isPaid: isPaid !== undefined ? isPaid : existing.isPaid,
            paidAt: isPaid !== undefined ? (isPaid && paidAt ? new Date(paidAt) : null) : existing.paidAt,
            totalAmount,
            serviceLines: {
              create: lines.map((l: { expenseItemId: string; amount: number }) => ({
                expenseItemId: l.expenseItemId,
                amount: l.amount,
              })),
            },
          },
          include: DOC_INCLUDE,
        });
      });
      void writeAudit({ action: "UPDATE", entityType: "EXPENSE_DOCUMENT", entityId: id, userId: user.sub, oldValues: { totalAmount: existing.totalAmount, isPaid: existing.isPaid }, newValues: { totalAmount: doc.totalAmount, isPaid: doc.isPaid } });
      return ok(doc);
    }

    // INVENTORY — validate lines upfront
    if (lines.some((l: { productId: string }) => !l.productId)) return badRequest("productId required on each inventory line");
    if (lines.some((l: { quantity: number }) => !l.quantity || l.quantity <= 0)) return badRequest("quantity must be > 0 on INVENTORY lines");
    if (lines.some((l: { unitPrice: number }) => !l.unitPrice || l.unitPrice <= 0)) return badRequest("unitPrice must be > 0 on INVENTORY lines");

    // Batch-fetch all products (new + old) in one query for validation and conflict reporting
    const newProductIds: string[] = lines.map((l: { productId: string }) => l.productId);
    const oldProductIds = existing.inventoryLines.map((ol) => ol.productId);
    const allProductIds = [...new Set([...newProductIds, ...oldProductIds])];

    const products = await prisma.product.findMany({
      where: { id: { in: allProductIds } },
      select: { id: true, name: true, isActive: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const pid of new Set(newProductIds)) {
      const p = productMap.get(pid);
      if (!p || !p.isActive) return badRequest(`Product ${pid} is inactive`);
    }

    // Build per-product quantity maps
    const oldQtyByProduct: Record<string, number> = {};
    for (const ol of existing.inventoryLines) {
      oldQtyByProduct[ol.productId] = (oldQtyByProduct[ol.productId] || 0) + Number(ol.quantity);
    }
    const newQtyByProduct: Record<string, number> = {};
    for (const nl of lines) {
      newQtyByProduct[nl.productId] = (newQtyByProduct[nl.productId] || 0) + nl.quantity;
    }

    // Net delta per product — positive = net IN, negative = net OUT
    const deltaByProduct: Record<string, number> = {};
    for (const pid of allProductIds) {
      const d = (newQtyByProduct[pid] || 0) - (oldQtyByProduct[pid] || 0);
      if (d !== 0) deltaByProduct[pid] = d;
    }

    // Stock integrity check — batch-fetch inventory only for products with negative net delta
    const negDeltaIds = Object.entries(deltaByProduct).filter(([, d]) => d < 0).map(([pid]) => pid);
    if (negDeltaIds.length > 0) {
      const inventories = await prisma.inventory.findMany({
        where: { productId: { in: negDeltaIds } },
        select: { productId: true, quantity: true },
      });
      const invMap = new Map(inventories.map((i) => [i.productId, Number(i.quantity)]));

      const conflictProducts = negDeltaIds
        .map((pid) => {
          const currentQty = invMap.get(pid) ?? 0;
          const wouldBecome = currentQty + deltaByProduct[pid];
          if (wouldBecome >= 0) return null;
          return { productId: pid, productName: productMap.get(pid)?.name ?? pid, currentQty, wouldBecome, shortfall: -wouldBecome };
        })
        .filter(Boolean);

      if (conflictProducts.length > 0) {
        return conflict("Some products have insufficient stock to reverse the receipt", "STOCK_ALREADY_CONSUMED", { products: conflictProducts });
      }
    }

    const totalAmount = lines.reduce((s: number, l: { quantity: number; unitPrice: number }) => s + Math.round(l.quantity * l.unitPrice), 0);

    const doc = await prisma.$transaction(async (tx) => {
      // Stage 1: reversal movements (batch) + delete old lines + net inventory updates — all independent
      await Promise.all([
        tx.stockMovement.createMany({
          data: Object.entries(oldQtyByProduct).map(([productId, qty]) => ({
            productId,
            type: "OUT" as StockMovementType,
            quantity: qty,
            reason: "MANUAL" as StockMovementReason,
            refType: "EXPENSE_DOCUMENT",
            refId: id,
            note: "Reversal for document edit",
            createdById: user.sub,
          })),
        }),
        tx.inventoryReceiptLine.deleteMany({ where: { documentId: id } }),
        ...Object.entries(deltaByProduct).map(([pid, delta]) =>
          tx.inventory.update({ where: { productId: pid }, data: { quantity: { increment: delta } } })
        ),
      ]);

      // Stage 2: update document with new lines + new IN movements — independent of each other
      const [updatedDoc] = await Promise.all([
        tx.expenseDocument.update({
          where: { id },
          data: {
            ...(documentDate ? { documentDate: new Date(documentDate) } : {}),
            accountingMonth,
            vendorName: vendorName !== undefined ? (vendorName?.trim() || null) : existing.vendorName,
            ...(paymentMethodId !== undefined
              ? { paymentMethod: paymentMethodId ? { connect: { id: paymentMethodId } } : { disconnect: true } }
              : {}),
            referenceNumber: referenceNumber !== undefined ? (referenceNumber?.trim() || null) : existing.referenceNumber,
            note: note !== undefined ? (note?.trim() || null) : existing.note,
            isPaid: isPaid !== undefined ? isPaid : existing.isPaid,
            paidAt: isPaid !== undefined ? (isPaid && paidAt ? new Date(paidAt) : null) : existing.paidAt,
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
          include: DOC_INCLUDE,
        }),
        tx.stockMovement.createMany({
          data: Object.entries(newQtyByProduct).map(([productId, qty]) => ({
            productId,
            type: "IN" as StockMovementType,
            quantity: qty,
            reason: "PURCHASE" as StockMovementReason,
            refType: "EXPENSE_DOCUMENT",
            refId: id,
            createdById: user.sub,
          })),
        }),
      ]);

      return updatedDoc;
    });

    void writeAudit({ action: "UPDATE", entityType: "EXPENSE_DOCUMENT", entityId: id, userId: user.sub, oldValues: { totalAmount: existing.totalAmount, isPaid: existing.isPaid }, newValues: { totalAmount: doc.totalAmount, isPaid: doc.isPaid } });
    return ok(doc);
  } catch (e) { return serverError(e); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) return badRequest("Unauthorized");

    const existing = await prisma.expenseDocument.findUnique({
      where: { id },
      include: { inventoryLines: true },
    });
    if (!existing || !existing.isActive) return notFound();

    if (existing.type === "INVENTORY_ADJUSTMENT") {
      return conflict("Inventory adjustment documents cannot be deleted", "ADJUSTMENT_IMMUTABLE");
    }

    if (existing.type === "INVENTORY") {
      const qtyByProduct: Record<string, number> = {};
      for (const line of existing.inventoryLines) {
        qtyByProduct[line.productId] = (qtyByProduct[line.productId] || 0) + Number(line.quantity);
      }

      const productIds = Object.keys(qtyByProduct);

      // Batch-fetch inventory + product names in parallel
      const [inventories, products] = await Promise.all([
        prisma.inventory.findMany({
          where: { productId: { in: productIds } },
          select: { productId: true, quantity: true },
        }),
        prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        }),
      ]);
      const invMap = new Map(inventories.map((i) => [i.productId, Number(i.quantity)]));
      const productNameMap = new Map(products.map((p) => [p.id, p.name]));

      const conflictProducts = productIds
        .map((pid) => {
          const currentQty = invMap.get(pid) ?? 0;
          const wouldBecome = currentQty - qtyByProduct[pid];
          if (wouldBecome >= 0) return null;
          return { productId: pid, productName: productNameMap.get(pid) ?? pid, currentQty, wouldBecome, shortfall: -wouldBecome };
        })
        .filter(Boolean);

      if (conflictProducts.length > 0) {
        return conflict("Some products have insufficient stock to reverse the receipt", "STOCK_ALREADY_CONSUMED", { products: conflictProducts });
      }

      await prisma.$transaction(async (tx) => {
        await Promise.all([
          tx.stockMovement.createMany({
            data: Object.entries(qtyByProduct).map(([productId, qty]) => ({
              productId,
              type: "OUT" as StockMovementType,
              quantity: qty,
              reason: "MANUAL" as StockMovementReason,
              refType: "EXPENSE_DOCUMENT",
              refId: id,
              note: "Reversal on document delete",
              createdById: user.sub,
            })),
          }),
          ...Object.entries(qtyByProduct).map(([pid, qty]) =>
            tx.inventory.update({ where: { productId: pid }, data: { quantity: { increment: -qty } } })
          ),
          tx.expenseDocument.update({ where: { id }, data: { isActive: false } }),
        ]);
      });

      void writeAudit({ action: "DELETE", entityType: "EXPENSE_DOCUMENT", entityId: id, userId: user.sub, oldValues: { type: existing.type, totalAmount: existing.totalAmount, isActive: true }, newValues: { isActive: false } });
      return ok({ id });
    }

    // SERVICE — unconditional soft-delete
    await prisma.expenseDocument.update({ where: { id }, data: { isActive: false } });
    void writeAudit({ action: "DELETE", entityType: "EXPENSE_DOCUMENT", entityId: id, userId: user.sub, oldValues: { type: existing.type, totalAmount: existing.totalAmount, isActive: true }, newValues: { isActive: false } });
    return ok({ id });
  } catch (e) { return serverError(e); }
}

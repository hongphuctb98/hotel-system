import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, serverError } from "@/lib/response";
import { requireAuth } from "@/lib/auth";

const billDetailInclude = {
  lease: { include: { room: { include: { floor: true } }, guest: true } },
  lines: { orderBy: { sortOrder: "asc" as const } },
  payments: {
    include: { paymentMethod: true },
    orderBy: { paymentDate: "desc" as const },
  },
};

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const bill = await prisma.tenantBill.findUnique({
      where: { id },
      include: billDetailInclude,
    });
    if (!bill) return notFound();

    const documents = await prisma.attachment.findMany({
      where: { entityType: "TENANT_BILL", entityId: id },
      orderBy: { order: "asc" },
    });

    const today = new Date();
    return ok({
      ...bill,
      isOverdue: bill.dueDate < today && (bill.status === "PENDING" || bill.status === "PARTIAL"),
      documents,
    });
  } catch (e) {
    return serverError(e);
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    await requireAuth();
    const body = await req.json();

    const bill = await prisma.tenantBill.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!bill) return notFound();

    if (bill.status !== "DRAFT") {
      return badRequest("Can only edit OTHER lines on DRAFT bills", "BILL_NOT_DRAFT");
    }

    // body.updateLines: patch specific lines by id (any type), clears isPending
    if (Array.isArray(body.updateLines)) {
      for (const patch of body.updateLines as { id: string; amount?: number; unitPrice?: number; quantity?: number; label?: string }[]) {
        await prisma.tenantBillLine.update({
          where: { id: patch.id },
          data: {
            ...(patch.amount !== undefined && { amount: patch.amount }),
            ...(patch.unitPrice !== undefined && { unitPrice: patch.unitPrice }),
            ...(patch.quantity !== undefined && { quantity: patch.quantity }),
            ...(patch.label !== undefined && { label: patch.label }),
            isPending: false,
          },
        });
      }
      const allLines = await prisma.tenantBillLine.findMany({ where: { billId: id } });
      const totalAmount = allLines.reduce((sum, l) => sum + l.amount, 0);
      await prisma.tenantBill.update({ where: { id }, data: { totalAmount } });
    }

    // body.lines: manage OTHER lines (add / edit / remove)
    if (Array.isArray(body.lines)) {
      // Delete removed OTHER lines
      const submittedIds = body.lines.filter((l: { id?: string }) => l.id).map((l: { id: string }) => l.id);
      const otherLines = bill.lines.filter((l) => l.type === "OTHER");
      const toDelete = otherLines.filter((l) => !submittedIds.includes(l.id));
      if (toDelete.length > 0) {
        await prisma.tenantBillLine.deleteMany({ where: { id: { in: toDelete.map((l) => l.id) } } });
      }

      for (const line of body.lines as { id?: string; label: string; quantity: number; unitPrice: number; amount: number; sortOrder?: number }[]) {
        if (line.id) {
          await prisma.tenantBillLine.update({
            where: { id: line.id },
            data: { label: line.label, quantity: line.quantity, unitPrice: line.unitPrice, amount: line.amount, sortOrder: line.sortOrder ?? 99, isPending: false },
          });
        } else {
          await prisma.tenantBillLine.create({
            data: {
              billId: id,
              type: "OTHER",
              label: line.label,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              amount: line.amount,
              isPending: false,
              sortOrder: line.sortOrder ?? 99,
            },
          });
        }
      }

      // Recalculate total
      const allLines = await prisma.tenantBillLine.findMany({ where: { billId: id } });
      const totalAmount = allLines.reduce((sum, l) => sum + l.amount, 0);
      await prisma.tenantBill.update({ where: { id }, data: { totalAmount } });
    }

    if (body.notes !== undefined) {
      await prisma.tenantBill.update({ where: { id }, data: { notes: body.notes } });
    }

    const updated = await prisma.tenantBill.findUnique({ where: { id }, include: billDetailInclude });
    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

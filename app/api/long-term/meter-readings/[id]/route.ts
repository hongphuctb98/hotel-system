import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, conflict, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";
import { Prisma } from "@/prisma/generated/client";
const Decimal = Prisma.Decimal;

async function updateBillLineForReading(
  leaseId: string,
  feeItemId: string,
  readingMonth: string,
  consumption: Prisma.Decimal,
  unitPrice: number
) {
  const bill = await prisma.tenantBill.findUnique({
    where: { leaseId_billingMonth: { leaseId, billingMonth: readingMonth } },
    include: { lines: true },
  });
  if (!bill || !["DRAFT", "PENDING"].includes(bill.status)) return;

  const line = bill.lines.find((l) => l.feeItemId === feeItemId && l.category === "METERED_FEE");
  if (!line) return;

  const qty = Number(consumption);
  const amount = Math.round(qty * unitPrice);

  await prisma.tenantBillLine.update({
    where: { id: line.id },
    data: { quantity: qty, unitPrice, amount, isPending: false },
  });

  const updatedLines = await prisma.tenantBillLine.findMany({ where: { billId: bill.id } });
  const total = updatedLines.reduce((sum, l) => sum + l.amount, 0);
  await prisma.tenantBill.update({ where: { id: bill.id }, data: { totalAmount: total } });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { previousReading, currentReading } = body;

    const existing = await prisma.longTermMeterReading.findUnique({
      where: { id },
      include: { feeItem: true },
    });
    if (!existing) return notFound();

    // Block update if a PARTIAL/PAID bill exists for this period
    const bill = await prisma.tenantBill.findUnique({
      where: { leaseId_billingMonth: { leaseId: existing.leaseId, billingMonth: existing.readingMonth } },
    });
    if (bill && ["PARTIAL", "PAID"].includes(bill.status)) {
      return conflict("Cannot update reading — bill for this period is already approved", "BILL_ALREADY_APPROVED");
    }

    if (Number(currentReading) < Number(previousReading)) {
      return badRequest("Current reading cannot be less than previous reading", "READING_CURRENT_LESS_THAN_PREV");
    }

    const prev = new Decimal(previousReading ?? existing.previousReading);
    const curr = new Decimal(currentReading ?? existing.currentReading);
    const consumption = curr.minus(prev);

    const updated = await prisma.longTermMeterReading.update({
      where: { id },
      data: { previousReading: prev, currentReading: curr, consumption },
      include: { feeItem: true },
    });

    const ratePlanItem = await prisma.longTermRatePlanItem.findFirst({
      where: { feeItemId: existing.feeItemId, ratePlan: { isActive: true } },
      orderBy: { ratePlan: { effectiveFrom: "desc" } },
    });
    if (ratePlanItem) {
      await updateBillLineForReading(existing.leaseId, existing.feeItemId, existing.readingMonth, consumption, ratePlanItem.unitPrice);
    }

    void writeAudit({ action: "UPDATE", entityType: "LONG_TERM_METER_READING", entityId: id, userId: user.sub, oldValues: { previousReading: String(existing.previousReading), currentReading: String(existing.currentReading) }, newValues: { previousReading: String(prev), currentReading: String(curr) } });

    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, conflict, serverError } from "@/lib/response";
import { parseQueryParams } from "@/common/utils/queryParams";
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

export async function GET(req: NextRequest) {
  try {
    const { page, limit } = parseQueryParams(req.nextUrl.searchParams);
    const sp = req.nextUrl.searchParams;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (sp.get("leaseId")) where.leaseId = sp.get("leaseId");
    if (sp.get("feeItemId")) where.feeItemId = sp.get("feeItemId");
    if (sp.get("readingMonth")) where.readingMonth = sp.get("readingMonth");

    const [readings, total] = await Promise.all([
      prisma.longTermMeterReading.findMany({
        where,
        skip,
        take: limit,
        orderBy: { readingMonth: "desc" },
        include: { feeItem: true, lease: { include: { room: true, guest: true } } },
      }),
      prisma.longTermMeterReading.count({ where }),
    ]);

    return ok(readings, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { leaseId, feeItemId, readingMonth, previousReading, currentReading } = body;

    if (!leaseId || !feeItemId || !readingMonth || previousReading == null || currentReading == null) {
      return badRequest("All fields are required", "VALIDATION_REQUIRED");
    }

    const feeItem = await prisma.longTermFeeItem.findUnique({ where: { id: feeItemId } });
    if (!feeItem || feeItem.type !== "METERED") {
      return badRequest("Fee item must exist and have type METERED", "FEE_ITEM_NOT_METERED");
    }

    if (Number(currentReading) < Number(previousReading)) {
      return badRequest("Current reading cannot be less than previous reading", "READING_CURRENT_LESS_THAN_PREV");
    }

    const existing = await prisma.longTermMeterReading.findUnique({
      where: { leaseId_feeItemId_readingMonth: { leaseId, feeItemId, readingMonth } },
    });
    if (existing) return conflict("Reading already exists for this lease, fee item, and month", "READING_DUPLICATE");

    const consumption = new Decimal(currentReading).minus(new Decimal(previousReading));

    const reading = await prisma.longTermMeterReading.create({
      data: {
        leaseId,
        feeItemId,
        readingMonth,
        previousReading: new Decimal(previousReading),
        currentReading: new Decimal(currentReading),
        consumption,
      },
      include: { feeItem: true },
    });

    // Update matching METERED_FEE bill line if a DRAFT/PENDING bill exists
    const ratePlanItem = await prisma.longTermRatePlanItem.findFirst({
      where: { feeItemId, ratePlan: { isActive: true } },
      orderBy: { ratePlan: { effectiveFrom: "desc" } },
    });
    if (ratePlanItem) {
      await updateBillLineForReading(leaseId, feeItemId, readingMonth, consumption, ratePlanItem.unitPrice);
    }

    void writeAudit({ action: "CREATE", entityType: "LONG_TERM_METER_READING", entityId: reading.id, userId: user.sub, newValues: { leaseId, feeItemId, readingMonth } });

    return created(reading);
  } catch (e) {
    return serverError(e);
  }
}

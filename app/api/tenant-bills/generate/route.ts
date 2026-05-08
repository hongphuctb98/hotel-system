import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";
import { calculateProratedRent } from "@/common/utils/leaseProration";
import dayjs from "dayjs";
import type { TenantBillLineCategory } from "@/prisma/generated/client";

type SkipEntry = { leaseId: string; guestName: string; roomNumber: string; reason: string };

type LineInput = {
  type?: string;
  category: TenantBillLineCategory;
  feeItemId: string | null;
  label: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  isPending: boolean;
  sortOrder: number;
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json().catch(() => ({}));

    const now = dayjs();
    const month = body.month ? String(body.month).padStart(2, "0") : String(now.month() + 1).padStart(2, "0");
    const year = body.year ? String(body.year) : String(now.year());
    const billingMonth = `${year}-${month}`;
    const periodStart = dayjs(`${billingMonth}-01`);

    if (!periodStart.isValid()) {
      return badRequest("Invalid month/year");
    }

    // Find applicable rate plan (highest effectiveFrom ≤ period start, active only)
    const ratePlan = await prisma.longTermRatePlan.findFirst({
      where: { isActive: true, effectiveFrom: { lte: periodStart.toDate() } },
      orderBy: { effectiveFrom: "desc" },
      include: { items: { include: { feeItem: true } } },
    });

    // Load all active fee items once
    const allFeeItems = await prisma.longTermFeeItem.findMany({ where: { isActive: true }, orderBy: { code: "asc" } });

    // Only ACTIVE leases are eligible
    const leases = await prisma.leaseContract.findMany({
      where: { isActive: true },
      include: { guest: true, room: true },
    });

    let created = 0;
    let regenerated = 0;
    const skipped: SkipEntry[] = [];
    const failed: SkipEntry[] = [];

    for (const lease of leases) {
      const guestName = `${lease.guest.firstName} ${lease.guest.lastName}`;
      const roomNumber = lease.room.number;

      try {
        // Only ACTIVE leases are eligible
        if (lease.status !== "ACTIVE") {
          const reason =
            lease.status === "TERMINATED" ? "LEASE_TERMINATED"
            : lease.status === "EXPIRED" ? "LEASE_EXPIRED"
            : "LEASE_NOT_ACTIVE";
          skipped.push({ leaseId: lease.id, guestName, roomNumber, reason });
          continue;
        }

        // Check billing period is within lease dates
        const leaseStart = dayjs(lease.startDate).startOf("month");
        if (periodStart.isBefore(leaseStart)) {
          skipped.push({ leaseId: lease.id, guestName, roomNumber, reason: "LEASE_NOT_IN_BILLING_PERIOD" });
          continue;
        }
        if (lease.endDate) {
          const leaseEnd = dayjs(lease.endDate).endOf("month");
          if (periodStart.isAfter(leaseEnd)) {
            skipped.push({ leaseId: lease.id, guestName, roomNumber, reason: "LEASE_NOT_IN_BILLING_PERIOD" });
            continue;
          }
        }

        // Calculate pro-rated rent
        const rentAmount = calculateProratedRent(lease.monthlyRent, lease.startDate, lease.endDate, billingMonth);
        if (rentAmount <= 0) {
          skipped.push({ leaseId: lease.id, guestName, roomNumber, reason: "LEASE_NOT_IN_BILLING_PERIOD" });
          continue;
        }

        // Check existing bill
        const existing = await prisma.tenantBill.findUnique({
          where: { leaseId_billingMonth: { leaseId: lease.id, billingMonth } },
          include: { lines: true },
        });

        // PARTIAL or PAID — skip
        if (existing && (existing.status === "PARTIAL" || existing.status === "PAID")) {
          skipped.push({ leaseId: lease.id, guestName, roomNumber, reason: "BILL_ALREADY_PAID_OR_PARTIAL" });
          continue;
        }

        // Rate plan required
        if (!ratePlan) {
          failed.push({ leaseId: lease.id, guestName, roomNumber, reason: "MISSING_RATE_PLAN" });
          continue;
        }

        // Build lines using rate plan + fee items
        const lines = await buildLinesPhase2(lease.id, billingMonth, rentAmount, ratePlan, allFeeItems);

        if (existing) {
          // Regenerate: preserve OTHER lines, replace RENT/METERED_FEE/FIXED_FEE lines
          const otherLines = existing.lines.filter(
            (l) => l.category === "OTHER" || (l.category == null && l.type === "OTHER")
          );
          const newTotal = lines.reduce((s, l) => s + l.amount, 0)
            + otherLines.reduce((s, l) => s + l.amount, 0);

          await prisma.$transaction([
            prisma.tenantBillLine.deleteMany({
              where: { billId: existing.id, id: { notIn: otherLines.map((l) => l.id) } },
            }),
            prisma.tenantBillLine.createMany({ data: lines.map((l) => ({ ...l, billId: existing.id })) }),
            prisma.tenantBill.update({ where: { id: existing.id }, data: { totalAmount: newTotal } }),
          ]);

          void writeAudit({
            action: "UPDATE",
            entityType: "TENANT_BILL",
            entityId: existing.id,
            userId: user.sub,
            oldValues: { totalAmount: existing.totalAmount },
            newValues: { totalAmount: newTotal, regenerated: true },
          });

          regenerated++;
        } else {
          // Create new DRAFT
          const totalAmount = lines.reduce((s, l) => s + l.amount, 0);
          const dueDate = periodStart.date(lease.paymentDueDay).add(1, "month").toDate();

          const bill = await prisma.tenantBill.create({
            data: {
              leaseId: lease.id,
              billingMonth,
              totalAmount,
              dueDate,
              lines: { createMany: { data: lines } },
            },
          });

          void writeAudit({
            action: "CREATE",
            entityType: "TENANT_BILL",
            entityId: bill.id,
            userId: user.sub,
            newValues: { leaseId: lease.id, billingMonth, totalAmount },
          });

          created++;
        }
      } catch (err) {
        failed.push({ leaseId: lease.id, guestName, roomNumber, reason: "MISSING_REQUIRED_DATA" });
        console.error("[generate-bills] error for lease", lease.id, err);
      }
    }

    return ok({ created, regenerated, skipped, failed });
  } catch (e) {
    return serverError(e);
  }
}

type RatePlanWithItems = {
  items: { feeItemId: string; unitPrice: number; feeItem: { id: string; code: string; name: string; type: string } }[];
};

type FeeItem = { id: string; code: string; name: string; type: string };

async function buildLinesPhase2(
  leaseId: string,
  billingMonth: string,
  rentAmount: number,
  ratePlan: RatePlanWithItems,
  allFeeItems: FeeItem[]
): Promise<Omit<LineInput, "billId">[]> {
  const lines: Omit<LineInput, "billId">[] = [
    {
      category: "RENT",
      feeItemId: null,
      label: "RENT",
      quantity: 1,
      unitPrice: rentAmount,
      amount: rentAmount,
      isPending: false,
      sortOrder: 1,
    },
  ];

  // Build a map of feeItemId → ratePlanItem for quick lookup
  const planItemMap = new Map(ratePlan.items.map((item) => [item.feeItemId, item]));

  let sortOrder = 2;
  for (const feeItem of allFeeItems) {
    const planItem = planItemMap.get(feeItem.id);
    if (!planItem) continue; // Not in rate plan → no line

    if (feeItem.type === "METERED") {
      const reading = await prisma.longTermMeterReading.findUnique({
        where: { leaseId_feeItemId_readingMonth: { leaseId, feeItemId: feeItem.id, readingMonth: billingMonth } },
      });

      if (reading) {
        const qty = Number(reading.consumption);
        const amount = Math.round(qty * planItem.unitPrice);
        lines.push({
          type: feeItem.code,
          category: "METERED_FEE",
          feeItemId: feeItem.id,
          label: feeItem.name,
          quantity: qty,
          unitPrice: planItem.unitPrice,
          amount,
          isPending: false,
          sortOrder,
        });
      } else {
        lines.push({
          type: feeItem.code,
          category: "METERED_FEE",
          feeItemId: feeItem.id,
          label: feeItem.name,
          quantity: 0,
          unitPrice: planItem.unitPrice,
          amount: 0,
          isPending: true,
          sortOrder,
        });
      }
    } else {
      // FIXED
      lines.push({
        type: feeItem.code,
        category: "FIXED_FEE",
        feeItemId: feeItem.id,
        label: feeItem.name,
        quantity: 1,
        unitPrice: planItem.unitPrice,
        amount: planItem.unitPrice,
        isPending: false,
        sortOrder,
      });
    }

    sortOrder++;
  }

  return lines;
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/response";
import { parseQueryParams } from "@/common/utils/queryParams";

export async function GET(req: NextRequest) {
  try {
    const { page, limit } = parseQueryParams(req.nextUrl.searchParams);
    const sp = req.nextUrl.searchParams;
    const skip = (page - 1) * limit;

    const leaseId = sp.get("leaseId") ?? undefined;
    const readingMonth = sp.get("readingMonth") ?? undefined;

    // Fetch distinct (leaseId, readingMonth) pairs with count using groupBy
    const where: Record<string, unknown> = {};
    if (leaseId) where.leaseId = leaseId;
    if (readingMonth) where.readingMonth = readingMonth;

    const groups = await prisma.longTermMeterReading.groupBy({
      by: ["leaseId", "readingMonth"],
      where,
      orderBy: [{ readingMonth: "desc" }, { leaseId: "asc" }],
      skip,
      take: limit,
    });

    const totalGroups = await prisma.longTermMeterReading.groupBy({
      by: ["leaseId", "readingMonth"],
      where,
    });
    const total = totalGroups.length;

    if (groups.length === 0) {
      return ok([], { total: 0, page, limit, totalPages: 0 });
    }

    // Fetch all readings for these groups in one query
    const groupConditions = groups.map((g) => ({
      leaseId: g.leaseId,
      readingMonth: g.readingMonth,
    }));

    const readings = await prisma.longTermMeterReading.findMany({
      where: { OR: groupConditions },
      include: {
        feeItem: true,
        lease: { include: { room: true, guest: true } },
      },
      orderBy: [{ readingMonth: "desc" }, { leaseId: "asc" }],
    });

    // Fetch matching bills for each group
    const bills = await prisma.tenantBill.findMany({
      where: {
        OR: groupConditions.map((g) => ({
          leaseId: g.leaseId,
          billingMonth: g.readingMonth,
        })),
      },
      select: { id: true, leaseId: true, billingMonth: true, status: true, totalAmount: true, dueDate: true },
    });

    const billMap = new Map(bills.map((b) => [`${b.leaseId}::${b.billingMonth}`, b]));

    // Group readings by leaseId + readingMonth
    const readingsByGroup = new Map<string, typeof readings>();
    for (const r of readings) {
      const key = `${r.leaseId}::${r.readingMonth}`;
      if (!readingsByGroup.has(key)) readingsByGroup.set(key, []);
      readingsByGroup.get(key)!.push(r);
    }

    const summaryRows = groups.map((g) => {
      const key = `${g.leaseId}::${g.readingMonth}`;
      const groupReadings = readingsByGroup.get(key) ?? [];
      const lease = groupReadings[0]?.lease ?? null;
      const bill = billMap.get(key) ?? null;

      return {
        leaseId: g.leaseId,
        readingMonth: g.readingMonth,
        lease,
        readings: groupReadings.map((r) => ({
          id: r.id,
          feeItemId: r.feeItemId,
          feeItem: r.feeItem,
          previousReading: Number(r.previousReading),
          currentReading: Number(r.currentReading),
          consumption: Number(r.consumption),
        })),
        bill,
      };
    });

    return ok(summaryRows, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return serverError(e);
  }
}

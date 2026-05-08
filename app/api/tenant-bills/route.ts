import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/response";
import { parseQueryParams } from "@/common/utils/queryParams";

export async function GET(req: NextRequest) {
  try {
    const { page, limit } = parseQueryParams(req.nextUrl.searchParams);
    const sp = req.nextUrl.searchParams;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (sp.get("leaseId")) where.leaseId = sp.get("leaseId");
    if (sp.get("billingMonth")) where.billingMonth = sp.get("billingMonth");
    if (sp.get("status")) where.status = sp.get("status");

    const [bills, total] = await Promise.all([
      prisma.tenantBill.findMany({
        where,
        include: {
          lease: {
            include: { room: { include: { floor: true } }, guest: true },
          },
          lines: { orderBy: { sortOrder: "asc" } },
        },
        skip,
        take: limit,
        orderBy: [{ billingMonth: "desc" }, { createdAt: "desc" }],
      }),
      prisma.tenantBill.count({ where }),
    ]);

    const today = new Date();
    const billsWithOverdue = bills.map((bill) => ({
      ...bill,
      isOverdue:
        bill.dueDate < today &&
        (bill.status === "PENDING" || bill.status === "PARTIAL"),
    }));

    return ok(billsWithOverdue, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return serverError(e);
  }
}

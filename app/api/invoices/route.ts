import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/response";
import { parseQueryParams } from "@/common/utils/queryParams";

const invoiceInclude = {
  booking: {
    include: {
      guest: true,
      room: true,
    },
  },
  payments: { include: { paymentMethod: true } },
};

export async function GET(req: NextRequest) {
  try {
    const { page, limit, filters } = parseQueryParams(req.nextUrl.searchParams);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.isPaid !== undefined) where.isPaid = filters.isPaid === "true";

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: invoiceInclude,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoice.count({ where }),
    ]);

    return ok(invoices, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return serverError(e);
  }
}

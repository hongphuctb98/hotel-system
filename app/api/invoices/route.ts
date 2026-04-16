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
    const { page, limit, search, filters } = parseQueryParams(req.nextUrl.searchParams);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.isPaid !== undefined) where.isPaid = filters.isPaid === "true";

    if (filters.issuedFrom || filters.issuedTo) {
      where.issuedAt = {
        ...(filters.issuedFrom ? { gte: new Date(filters.issuedFrom) } : {}),
        ...(filters.issuedTo
          ? { lte: new Date(new Date(filters.issuedTo).getTime() + 86_400_000 - 1) }
          : {}),
      };
    }

    if (filters.roomNumber) {
      where.booking = { room: { number: { contains: filters.roomNumber, mode: "insensitive" } } };
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { booking: { guest: { firstName: { contains: search, mode: "insensitive" } } } },
        { booking: { guest: { lastName:  { contains: search, mode: "insensitive" } } } },
      ];
    }

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

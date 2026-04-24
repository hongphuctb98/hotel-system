import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/response";

export async function GET() {
  try {
    const result = await prisma.expenseDocument.findMany({
      where: { isActive: true, vendorName: { not: null } },
      select: { vendorName: true },
      distinct: ["vendorName"],
      orderBy: { vendorName: "asc" },
      take: 50,
    });
    const vendors = result.map((r) => r.vendorName as string).filter(Boolean);
    return ok(vendors);
  } catch (e) { return serverError(e); }
}

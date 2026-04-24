import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountingMonthStr = searchParams.get("accountingMonth");
    if (!accountingMonthStr) return badRequest("accountingMonth required");

    const [year, month] = accountingMonthStr.split("-").map(Number);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));

    const lines = await prisma.serviceExpenseLine.findMany({
      where: {
        document: {
          isActive: true,
          type: "SERVICE",
          accountingMonth: { gte: monthStart, lt: monthEnd },
        },
      },
      select: { expenseItemId: true },
      distinct: ["expenseItemId"],
    });

    return ok(lines.map((l) => l.expenseItemId));
  } catch (e) { return serverError(e); }
}

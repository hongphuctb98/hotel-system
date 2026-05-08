import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, notFound, badRequest, serverError } from "@/lib/response";
import { parseQueryParams } from "@/common/utils/queryParams";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const { page, limit } = parseQueryParams(req.nextUrl.searchParams);
    const skip = (page - 1) * limit;

    const bill = await prisma.tenantBill.findUnique({ where: { id }, select: { id: true } });
    if (!bill) return notFound();

    const [payments, total] = await Promise.all([
      prisma.tenantBillPayment.findMany({
        where: { billId: id },
        include: { paymentMethod: true },
        skip,
        take: limit,
        orderBy: { paymentDate: "desc" },
      }),
      prisma.tenantBillPayment.count({ where: { billId: id } }),
    ]);

    return ok(payments, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const user = await requireAuth();
    const body = await req.json();

    if (body.amount == null) return badRequest("Amount is required", "VALIDATION_REQUIRED");
    if (!body.paymentMethodId) return badRequest("Payment method is required", "VALIDATION_REQUIRED");
    if (!body.paymentDate) return badRequest("Payment date is required", "VALIDATION_REQUIRED");

    const bill = await prisma.tenantBill.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!bill) return notFound();

    const amount = Number(body.amount);
    const outstanding = bill.totalAmount - bill.totalPaid;

    if (amount > outstanding) {
      return badRequest(`Payment amount exceeds outstanding balance of ${outstanding}`, "PAYMENT_EXCEEDS_BALANCE");
    }

    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.tenantBillPayment.create({
        data: {
          billId: id,
          amount,
          paymentDate: new Date(body.paymentDate),
          paymentMethodId: body.paymentMethodId,
          receiptImageUrl: body.receiptImageUrl ?? null,
          notes: body.notes ?? null,
        },
        include: { paymentMethod: true },
      });

      const newTotalPaid = bill.totalPaid + amount;
      const newStatus = newTotalPaid >= bill.totalAmount ? "PAID" : "PARTIAL";

      await tx.tenantBill.update({
        where: { id },
        data: { totalPaid: newTotalPaid, status: newStatus },
      });

      return newPayment;
    });

    void writeAudit({
      action: "CREATE",
      entityType: "TENANT_BILL_PAYMENT",
      entityId: payment.id,
      userId: user.sub,
      newValues: { billId: id, amount, paymentDate: body.paymentDate },
    });

    const updatedBill = await prisma.tenantBill.findUnique({
      where: { id },
      include: {
        lines: { orderBy: { sortOrder: "asc" } },
        payments: { include: { paymentMethod: true }, orderBy: { paymentDate: "desc" } },
        lease: { include: { room: { include: { floor: true } }, guest: true } },
      },
    });

    return created({ payment, bill: updatedBill });
  } catch (e) {
    return serverError(e);
  }
}

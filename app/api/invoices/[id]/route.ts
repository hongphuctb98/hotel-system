import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";

const invoiceInclude = {
  booking: {
    include: {
      guest: true,
      room: { include: { roomType: true, floor: true } },
      services: { include: { serviceItem: true } },
    },
  },
  payments: { include: { paymentMethod: true } },
};

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: invoiceInclude,
    });
    if (!invoice) return notFound();
    return ok(invoice);
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
    const body = await req.json();

    if (!body.action) return badRequest("action is required");

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!invoice) return notFound();

    if (body.action === "pay") {
      if (!body.paymentMethodId || !body.amount) {
        return badRequest("paymentMethodId and amount are required");
      }

      const payment = await prisma.payment.create({
        data: {
          invoiceId: id,
          paymentMethodId: body.paymentMethodId,
          amount: Number(body.amount),
          reference: body.reference ?? null,
          paidAt: new Date(),
        },
        include: { paymentMethod: true },
      });

      // Mark invoice paid if fully covered
      const totalPaid =
        invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0) +
        Number(body.amount);

      if (totalPaid >= Number(invoice.totalAmount)) {
        await prisma.invoice.update({
          where: { id },
          data: { isPaid: true },
        });
      }

      void writeAudit({
        action:     "PAYMENT",
        entityType: "PAYMENT",
        entityId:   payment.id,
        newValues:  { amount: String(payment.amount), paymentMethodId: payment.paymentMethodId },
      });

      const updated = await prisma.invoice.findUnique({
        where: { id },
        include: invoiceInclude,
      });

      return ok({ payment, invoice: updated });
    }

    return badRequest(`Unknown action: ${body.action}`);
  } catch (e) {
    return serverError(e);
  }
}

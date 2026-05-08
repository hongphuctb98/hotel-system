import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";
import { sendMail } from "@/lib/email";
import { buildTenantBillApprovedHtml } from "@/lib/emailTemplates/tenantBillApproved";

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const user = await requireAuth();

    const bill = await prisma.tenantBill.findUnique({
      where: { id },
      include: {
        lines: { orderBy: { sortOrder: "asc" } },
        lease: { include: { guest: true } },
      },
    });
    if (!bill) return notFound();

    if (bill.status !== "DRAFT") {
      return badRequest("Only DRAFT bills can be approved", "BILL_NOT_DRAFT");
    }

    // Validate no pending lines
    const hasPendingLines = bill.lines.some((l) => l.isPending);
    if (hasPendingLines) {
      return badRequest("Bill has pending utility readings — enter readings before approving", "BILL_HAS_PENDING_READINGS");
    }

    const updated = await prisma.tenantBill.update({
      where: { id },
      data: {
        status: "PENDING",
        approvedAt: new Date(),
        approvedById: user.sub,
      },
      include: {
        lines: { orderBy: { sortOrder: "asc" } },
        lease: { include: { guest: true } },
      },
    });

    // Send email
    let emailSent = false;
    const guestEmail = updated.lease.guest.email;
    if (guestEmail) {
      const tenantName = `${updated.lease.guest.firstName} ${updated.lease.guest.lastName}`;
      const html = buildTenantBillApprovedHtml({
        tenantName,
        billingMonth: updated.billingMonth,
        leaseId: updated.leaseId,
        lines: updated.lines.map((l) => ({
          label: l.label,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          amount: l.amount,
        })),
        totalAmount: updated.totalAmount,
        dueDate: updated.dueDate,
      });

      const result = await sendMail(guestEmail, `Hóa đơn tháng ${updated.billingMonth}`, html);
      emailSent = result.sent;

      if (emailSent) {
        await prisma.tenantBill.update({ where: { id }, data: { emailSent: true, emailSentAt: new Date() } });
      }
    }

    void writeAudit({
      action: "UPDATE",
      entityType: "TENANT_BILL",
      entityId: id,
      userId: user.sub,
      oldValues: { status: "DRAFT" },
      newValues: { status: "PENDING", approvedAt: updated.approvedAt },
    });

    return ok({ approved: true, emailSent, bill: updated });
  } catch (e) {
    return serverError(e);
  }
}

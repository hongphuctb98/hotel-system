import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, notFound, badRequest, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";
import { sendMail } from "@/lib/email";
import { buildTenantBillApprovedHtml } from "@/lib/emailTemplates/tenantBillApproved";
import dayjs from "dayjs";

export async function PATCH(
  _req: NextRequest,
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

    // Only sendable for approved/payable bills
    const today = dayjs();
    const isOverdue =
      today.isAfter(dayjs(bill.dueDate)) &&
      (bill.status === "PENDING" || bill.status === "PARTIAL");
    const sendableStatuses = ["PENDING", "PARTIAL"];
    if (!sendableStatuses.includes(bill.status) && !isOverdue) {
      return badRequest("Email can only be sent for PENDING, PARTIAL, or OVERDUE bills", "BILL_NOT_SENDABLE");
    }

    const guestEmail = bill.lease.guest.email;
    if (!guestEmail) {
      return ok({ sent: false, error: "NO_EMAIL_ADDRESS" });
    }

    const tenantName = `${bill.lease.guest.firstName} ${bill.lease.guest.lastName}`;
    const html = buildTenantBillApprovedHtml({
      tenantName,
      billingMonth: bill.billingMonth,
      leaseId: bill.leaseId,
      lines: bill.lines.map((l) => ({
        label: l.label,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        amount: l.amount,
      })),
      totalAmount: bill.totalAmount,
      dueDate: bill.dueDate,
    });

    const result = await sendMail(guestEmail, `Hóa đơn tháng ${bill.billingMonth}`, html);

    if (result.sent) {
      const now = new Date();
      await prisma.tenantBill.update({
        where: { id },
        data: { emailSent: true, emailSentAt: now },
      });

      void writeAudit({
        action: "UPDATE",
        entityType: "TENANT_BILL",
        entityId: id,
        userId: user.sub,
        newValues: { emailSentAt: now },
      });

      return ok({ sent: true, emailSentAt: now });
    }

    return ok({ sent: false, error: result.error });
  } catch (e) {
    return serverError(e);
  }
}

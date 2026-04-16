import type { PrismaClient } from "@/prisma/generated/client";

/**
 * Generates a human-readable invoice number in the format INV-YYYYMMDD-NNNN.
 *
 * The sequence resets daily — NNNN is the 1-based count of invoices issued
 * on the same UTC date, zero-padded to 4 digits.
 *
 * Pass the prisma client (or transaction client) so the count is consistent
 * within the surrounding transaction context.
 *
 * Example: INV-20260416-0001
 */
export async function generateInvoiceNumber(
  prisma: Pick<PrismaClient, "invoice">
): Promise<string> {
  const now = new Date();
  const y   = now.getUTCFullYear();
  const m   = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d   = String(now.getUTCDate()).padStart(2, "0");
  const datePart = `${y}${m}${d}`;

  const startOfDay = new Date(Date.UTC(y, now.getUTCMonth(), now.getUTCDate()));
  const endOfDay   = new Date(startOfDay.getTime() + 86_400_000);

  const count = await prisma.invoice.count({
    where: { issuedAt: { gte: startOfDay, lt: endOfDay } },
  });

  const seq = String(count + 1).padStart(4, "0");
  return `INV-${datePart}-${seq}`;
}

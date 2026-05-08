import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage, urlToKey } from "@/lib/storage";
import { ok, notFound, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await props.params;
    const user = await requireAuth();

    const attachment = await prisma.attachment.findUnique({ where: { id: docId } });
    if (!attachment || attachment.entityType !== "TENANT_BILL" || attachment.entityId !== id) {
      return notFound();
    }

    await storage.delete(urlToKey(attachment.url));
    await prisma.attachment.delete({ where: { id: docId } });

    void writeAudit({
      action: "DELETE",
      entityType: "ATTACHMENT",
      entityId: docId,
      userId: user.sub,
      oldValues: { entityType: "TENANT_BILL", entityId: id, name: attachment.name },
    });

    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}

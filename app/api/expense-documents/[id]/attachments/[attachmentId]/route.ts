import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage, urlToKey } from "@/lib/storage";
import { ok, notFound, serverError, badRequest } from "@/lib/response";
import { getAuthUser } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params;
    const user = await getAuthUser();
    if (!user) return badRequest("Unauthorized");

    const attachment = await prisma.expenseDocumentAttachment.findFirst({
      where: { id: attachmentId, documentId: id },
    });
    if (!attachment) return notFound();

    await storage.delete(urlToKey(attachment.url)).catch(() => {});
    await prisma.expenseDocumentAttachment.delete({ where: { id: attachmentId } });

    return ok({ id: attachmentId });
  } catch (e) {
    return serverError(e);
  }
}

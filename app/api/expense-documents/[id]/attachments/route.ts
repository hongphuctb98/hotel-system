import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { ok, badRequest, notFound, serverError } from "@/lib/response";
import { getAuthUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) return badRequest("Unauthorized");

    const doc = await prisma.expenseDocument.findUnique({ where: { id }, select: { id: true } });
    if (!doc) return notFound();

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") return badRequest("No file provided");

    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
    const key = `expense-documents/${id}/attachments/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await storage.upload(key, buffer, file.type || "application/octet-stream");

    const last = await prisma.expenseDocumentAttachment.findFirst({
      where: { documentId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const order = (last?.order ?? -1) + 1;

    const attachment = await prisma.expenseDocumentAttachment.create({
      data: { documentId: id, url, name: file.name, order },
    });

    return ok(attachment);
  } catch (e) {
    return serverError(e);
  }
}

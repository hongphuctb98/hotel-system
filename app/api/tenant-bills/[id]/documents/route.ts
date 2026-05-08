import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { ok, badRequest, notFound, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const user = await requireAuth();

    const bill = await prisma.tenantBill.findUnique({ where: { id }, select: { id: true } });
    if (!bill) return notFound();

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") return badRequest("No file provided");

    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
    const key = `tenant-bills/${id}/documents/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await storage.upload(key, buffer, file.type || "application/octet-stream");

    const lastAttachment = await prisma.attachment.findFirst({
      where: { entityType: "TENANT_BILL", entityId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const order = (lastAttachment?.order ?? -1) + 1;

    const attachment = await prisma.attachment.create({
      data: {
        entityType: "TENANT_BILL",
        entityId: id,
        url,
        name: file.name,
        mimeType: file.type || null,
        order,
      },
    });

    void writeAudit({
      action: "CREATE",
      entityType: "ATTACHMENT",
      entityId: attachment.id,
      userId: user.sub,
      newValues: { entityType: "TENANT_BILL", entityId: id, name: file.name },
    });

    return ok(attachment);
  } catch (e) {
    return serverError(e);
  }
}

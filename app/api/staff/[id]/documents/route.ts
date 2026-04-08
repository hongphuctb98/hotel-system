import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { ok, badRequest, notFound, serverError } from "@/lib/response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const staff = await prisma.staff.findUnique({ where: { id }, select: { id: true } });
    if (!staff) return notFound();

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") return badRequest("No file provided");

    const type = (formData.get("type") as string | null) ?? "OTHER";
    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
    const key = `staff/${id}/documents/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await storage.upload(key, buffer, file.type || "application/octet-stream");

    const lastDoc = await prisma.staffDocument.findFirst({
      where: { staffId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const order = (lastDoc?.order ?? -1) + 1;

    const doc = await prisma.staffDocument.create({
      data: { staffId: id, url, name: file.name, type, order },
    });

    return ok({ ...doc, createdAt: doc.createdAt.toISOString() });
  } catch (e) {
    return serverError(e);
  }
}

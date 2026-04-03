import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { ok, notFound, serverError } from "@/lib/response";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { docId } = await params;

    const doc = await prisma.staffDocument.findUnique({
      where: { id: docId },
      select: { url: true },
    });
    if (!doc) return notFound();

    const filePath = path.join(process.cwd(), "public", doc.url);
    await fs.rm(filePath, { force: true });

    await prisma.staffDocument.delete({ where: { id: docId } });

    return ok({ id: docId });
  } catch (e) {
    return serverError(e);
  }
}

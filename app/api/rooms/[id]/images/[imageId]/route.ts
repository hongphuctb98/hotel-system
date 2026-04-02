import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { ok, notFound, serverError } from "@/lib/response";

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { imageId } = await props.params;

    const image = await prisma.roomImage.findUnique({ where: { id: imageId } });
    if (!image) return notFound();

    const filePath = path.join(process.cwd(), "public", image.url);
    await fs.unlink(filePath).catch(() => {
      // File may already be missing — proceed with DB cleanup
    });

    await prisma.roomImage.delete({ where: { id: imageId } });

    return ok({ id: imageId });
  } catch (e) {
    return serverError(e);
  }
}

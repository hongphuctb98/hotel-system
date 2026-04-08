import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage, urlToKey } from "@/lib/storage";
import { ok, notFound, serverError } from "@/lib/response";

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { imageId } = await props.params;

    const image = await prisma.roomImage.findUnique({ where: { id: imageId } });
    if (!image) return notFound();

    await storage.delete(urlToKey(image.url)).catch(() => {
      // File may already be missing — proceed with DB cleanup
    });

    await prisma.roomImage.delete({ where: { id: imageId } });

    return ok({ id: imageId });
  } catch (e) {
    return serverError(e);
  }
}

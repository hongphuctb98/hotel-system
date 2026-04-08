import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { storage, urlToKey } from "@/lib/storage";
import { ok, badRequest, notFound, serverError } from "@/lib/response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const staff = await prisma.staff.findUnique({ where: { id }, select: { id: true, avatarUrl: true } });
    if (!staff) return notFound();

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") return badRequest("No file provided");

    // Remove old avatar if exists
    if (staff.avatarUrl) {
      await storage.delete(urlToKey(staff.avatarUrl)).catch(() => {});
    }

    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const key = `staff/${id}/avatar.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const avatarUrl = await storage.upload(key, buffer, file.type || "image/jpeg");

    const updated = await prisma.staff.update({
      where: { id },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });

    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const staff = await prisma.staff.findUnique({ where: { id }, select: { avatarUrl: true } });
    if (!staff) return notFound();

    if (staff.avatarUrl) {
      await storage.delete(urlToKey(staff.avatarUrl)).catch(() => {});
    }

    await prisma.staff.update({ where: { id }, data: { avatarUrl: null } });

    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}

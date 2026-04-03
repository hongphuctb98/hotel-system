import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
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

    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const filename = `avatar.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "staff", id);
    await fs.mkdir(uploadDir, { recursive: true });

    // Remove old avatar file if it exists and has a different extension
    if (staff.avatarUrl) {
      const oldFile = path.join(process.cwd(), "public", staff.avatarUrl);
      await fs.rm(oldFile, { force: true });
    }

    const filePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const avatarUrl = `/uploads/staff/${id}/${filename}`;
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
      const filePath = path.join(process.cwd(), "public", staff.avatarUrl);
      await fs.rm(filePath, { force: true });
    }

    await prisma.staff.update({ where: { id }, data: { avatarUrl: null } });

    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}

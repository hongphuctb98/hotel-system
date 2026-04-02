import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, notFound, serverError } from "@/lib/response";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await props.params;

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return notFound();

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") return badRequest("No file provided");

    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "rooms", roomId);
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const lastImage = await prisma.roomImage.findFirst({
      where: { roomId },
      orderBy: { order: "desc" },
    });
    const order = (lastImage?.order ?? -1) + 1;

    const image = await prisma.roomImage.create({
      data: {
        roomId,
        url: `/uploads/rooms/${roomId}/${filename}`,
        order,
      },
    });

    return ok(image);
  } catch (e) {
    return serverError(e);
  }
}

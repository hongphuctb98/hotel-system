import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { ok, unauthorized, notFound, serverError } from "@/lib/response";

export async function GET(_req: NextRequest) {
  try {
    const payload = await getAuthUser();
    if (!payload) return unauthorized("Not authenticated");

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        staff: { select: { name: true, avatarUrl: true } },
      },
    });

    if (!user || !user.isActive) return notFound();

    return ok({
      id: user.id,
      email: user.email,
      name: user.staff?.name ?? null,
      role: user.role,
      avatarUrl: user.staff?.avatarUrl ?? null,
    });
  } catch (e) {
    return serverError(e);
  }
}

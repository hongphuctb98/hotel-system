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
        name: true,
        role: true,
        avatarUrl: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) return notFound();

    return ok(user);
  } catch (e) {
    return serverError(e);
  }
}

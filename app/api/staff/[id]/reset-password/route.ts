import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getAuthUser();
    if (!caller) return forbidden("Unauthorized");

    const { id } = await params;
    const { newPassword } = await req.json();

    if (!newPassword) return badRequest("newPassword is required");

    const staff = await prisma.staff.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!staff) return notFound();

    // Cannot reset if no account is linked
    if (!staff.userId) {
      return badRequest("No account linked to this staff member");
    }

    // Prevent resetting own password through admin flow
    if (staff.userId === caller.sub) {
      return badRequest("Cannot reset your own password through this endpoint");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: staff.userId },
      data: { passwordHash },
    });

    return ok({ success: true });
  } catch (e) {
    return serverError(e);
  }
}

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { ok, badRequest, forbidden, notFound, conflict, serverError } from "@/lib/response";
import { toStaffDTO, staffInclude } from "../../route";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getAuthUser();
    if (!caller) return forbidden("Unauthorized");

    const { id } = await params;
    const { accountEmail, password, role } = await req.json();

    if (!accountEmail || !password || !role) {
      return badRequest("accountEmail, password, and role are required");
    }

    // Only ADMINs may assign the ADMIN role
    if (role === "ADMIN" && caller.role !== "ADMIN") {
      return forbidden("Only admins can assign the ADMIN role");
    }

    const staff = await prisma.staff.findUnique({
      where: { id },
      select: { id: true, userId: true, contactEmail: true },
    });
    if (!staff) return notFound();

    // Cannot provision if account already exists
    if (staff.userId) {
      return badRequest("This staff member already has an account");
    }

    // Check for duplicate login email
    const existing = await prisma.user.findUnique({
      where: { email: accountEmail },
      select: { id: true },
    });
    if (existing) {
      return conflict("This login email is already in use", "STAFF_ACCOUNT_EMAIL_TAKEN");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: accountEmail, passwordHash, role },
      });
      return tx.staff.update({
        where: { id },
        data: {
          userId: user.id,
          // Backfill contactEmail from accountEmail if not already set
          ...(staff.contactEmail === null && { contactEmail: accountEmail }),
        },
        include: staffInclude,
      });
    });

    return ok(toStaffDTO(updated));
  } catch (e) {
    return serverError(e);
  }
}

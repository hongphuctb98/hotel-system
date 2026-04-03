import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/response";
import { toStaffDTO, staffInclude } from "../route";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const staff = await prisma.staff.findUnique({ where: { id }, include: staffInclude });
    if (!staff) return notFound();
    return ok(toStaffDTO(staff));
  } catch (e) {
    return serverError(e);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getAuthUser();
    if (!caller) return forbidden("Unauthorized");

    const { id } = await params;
    const body = await req.json();

    const exists = await prisma.staff.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) return notFound();

    // PUT only updates Staff profile fields — role/accountEmail managed via /account endpoint
    const updated = await prisma.staff.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.contactEmail !== undefined && { contactEmail: body.contactEmail }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.position !== undefined && { position: body.position }),
        ...(body.department !== undefined && { department: body.department }),
        ...(body.joinedAt !== undefined && {
          joinedAt: body.joinedAt ? new Date(body.joinedAt) : null,
        }),
        ...(body.resignedAt !== undefined && {
          resignedAt: body.resignedAt ? new Date(body.resignedAt) : null,
        }),
        ...(body.note !== undefined && { note: body.note }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: staffInclude,
    });

    return ok(toStaffDTO(updated));
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const caller = await getAuthUser();
    if (!caller) return forbidden("Unauthorized");

    const { id } = await params;
    const staff = await prisma.staff.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!staff) return notFound();

    // Prevent self-deactivation
    if (staff.userId && staff.userId === caller.sub) {
      return badRequest("Cannot deactivate your own account");
    }

    // Deactivate Staff; also deactivate linked User account if one exists
    if (staff.userId) {
      await prisma.$transaction([
        prisma.staff.update({ where: { id }, data: { isActive: false } }),
        prisma.user.update({ where: { id: staff.userId }, data: { isActive: false } }),
      ]);
    } else {
      await prisma.staff.update({ where: { id }, data: { isActive: false } });
    }

    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}

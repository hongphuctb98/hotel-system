import { prisma } from "@/lib/prisma";
import { ok, badRequest, forbidden, serverError } from "@/lib/response";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const row = await prisma.hotelSettings.findUnique({ where: { id: "singleton" } });
    const timezone = row?.timezone ?? process.env.HOTEL_TIMEZONE ?? "Asia/Ho_Chi_Minh";
    return ok({
      timezone,
      hotelName: row?.hotelName ?? null,
      address: row?.address ?? null,
      phone: row?.phone ?? null,
      email: row?.email ?? null,
    });
  } catch (e) {
    return serverError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") return forbidden();

    const body = await req.json() as {
      timezone?: string;
      hotelName?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
    };

    const updateData: Record<string, unknown> = {};

    if (body.timezone !== undefined) {
      const { timezone } = body;
      if (typeof timezone !== "string" || timezone.trim() === "") {
        return badRequest("timezone must be a non-empty string");
      }
      updateData.timezone = timezone;
    }

    if (body.hotelName !== undefined) updateData.hotelName = body.hotelName || null;
    if (body.address !== undefined)   updateData.address   = body.address   || null;
    if (body.phone !== undefined)     updateData.phone     = body.phone     || null;
    if (body.email !== undefined)     updateData.email     = body.email     || null;

    if (Object.keys(updateData).length === 0) {
      return badRequest("No fields to update");
    }

    const row = await prisma.hotelSettings.upsert({
      where: { id: "singleton" },
      update: updateData,
      create: { id: "singleton", timezone: "Asia/Ho_Chi_Minh", ...updateData },
    });

    return ok({
      timezone: row.timezone,
      hotelName: row.hotelName ?? null,
      address:   row.address   ?? null,
      phone:     row.phone     ?? null,
      email:     row.email     ?? null,
    });
  } catch (e) {
    return serverError(e);
  }
}

import { prisma } from "@/lib/prisma";
import { ok, badRequest, forbidden, serverError } from "@/lib/response";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const row = await prisma.hotelSettings.findUnique({ where: { id: "singleton" } });
    const timezone = row?.timezone ?? process.env.HOTEL_TIMEZONE ?? "Asia/Ho_Chi_Minh";
    return ok({ timezone });
  } catch (e) {
    return serverError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") return forbidden();

    const body = await req.json();
    const { timezone } = body as { timezone?: string };

    if (!timezone || typeof timezone !== "string") {
      return badRequest("timezone is required");
    }

    const valid = Intl.supportedValuesOf("timeZone").includes(timezone);
    if (!valid) {
      return badRequest(`"${timezone}" is not a valid IANA timezone`);
    }

    const row = await prisma.hotelSettings.upsert({
      where: { id: "singleton" },
      update: { timezone },
      create: { id: "singleton", timezone },
    });

    return ok({ timezone: row.timezone });
  } catch (e) {
    return serverError(e);
  }
}

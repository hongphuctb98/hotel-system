import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/response";

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ roomTypeId: string }> }
) {
  try {
    const { roomTypeId } = await props.params;
    const body = await req.json();

    const record = await prisma.roomTypePricing.upsert({
      where: { roomTypeId },
      update: {
        ...(body.nightlyPrice     !== undefined && { nightlyPrice:     body.nightlyPrice     != null ? Number(body.nightlyPrice)     : null }),
        ...(body.dailyPrice       !== undefined && { dailyPrice:       body.dailyPrice       != null ? Number(body.dailyPrice)       : null }),
        ...(body.hourlyBlockHours !== undefined && { hourlyBlockHours: body.hourlyBlockHours != null ? Number(body.hourlyBlockHours) : null }),
        ...(body.hourlyBlockPrice !== undefined && { hourlyBlockPrice: body.hourlyBlockPrice != null ? Number(body.hourlyBlockPrice) : null }),
        ...(body.hourlyExtraPrice !== undefined && { hourlyExtraPrice: body.hourlyExtraPrice != null ? Number(body.hourlyExtraPrice) : null }),
      },
      create: {
        roomTypeId,
        nightlyPrice:     body.nightlyPrice     != null ? Number(body.nightlyPrice)     : null,
        dailyPrice:       body.dailyPrice       != null ? Number(body.dailyPrice)       : null,
        hourlyBlockHours: body.hourlyBlockHours != null ? Number(body.hourlyBlockHours) : null,
        hourlyBlockPrice: body.hourlyBlockPrice != null ? Number(body.hourlyBlockPrice) : null,
        hourlyExtraPrice: body.hourlyExtraPrice != null ? Number(body.hourlyExtraPrice) : null,
      },
    });

    return ok(record);
  } catch (e) {
    return serverError(e);
  }
}

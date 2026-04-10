import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/response";

export async function GET() {
  try {
    const records = await prisma.roomTypePricing.findMany({
      include: { roomType: true },
    });
    return ok(records);
  } catch (e) {
    return serverError(e);
  }
}

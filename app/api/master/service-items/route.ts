import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, conflict, serverError } from "@/lib/response";

export async function GET() {
  try {
    const items = await prisma.serviceItem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: { linkedProduct: { include: { inventory: true } } },
    });
    return ok(items);
  } catch (e) { return serverError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.code || !body.name) return badRequest("code and name required");

    if (body.linkedProductId) {
      const existingLink = await prisma.serviceItem.findFirst({
        where: { linkedProductId: body.linkedProductId },
      });
      if (existingLink) {
        return conflict("This product is already linked to another service item", "PRODUCT_ALREADY_LINKED");
      }
    }

    const item = await prisma.serviceItem.create({
      data: {
        code: body.code,
        name: body.name,
        unitPrice: body.unitPrice,
        unit: body.unit,
        linkedProductId: body.linkedProductId ?? null,
      },
      include: { linkedProduct: { include: { inventory: true } } },
    });
    return created(item);
  } catch (e) { return serverError(e); }
}

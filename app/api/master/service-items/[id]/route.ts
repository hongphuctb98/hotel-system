import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, conflict, serverError } from "@/lib/response";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const body = await req.json();

    if (body.linkedProductId) {
      const existingLink = await prisma.serviceItem.findFirst({
        where: { linkedProductId: body.linkedProductId, id: { not: id } },
      });
      if (existingLink) {
        return conflict("This product is already linked to another service item", "PRODUCT_ALREADY_LINKED");
      }
    }

    const item = await prisma.serviceItem.update({
      where: { id },
      data: {
        code: body.code,
        name: body.name,
        unitPrice: body.unitPrice,
        unit: body.unit,
        isActive: body.isActive,
        ...(body.linkedProductId !== undefined && { linkedProductId: body.linkedProductId || null }),
      },
      include: { linkedProduct: { include: { inventory: true } } },
    });
    return ok(item);
  } catch (e) { return serverError(e); }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    await prisma.serviceItem.update({ where: { id }, data: { isActive: false } });
    return ok({ id });
  } catch (e) { return serverError(e); }
}

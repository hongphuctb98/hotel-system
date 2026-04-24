import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, notFound, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest, props: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await props.params;
    const body = await req.json();

    if (body.reorderLevel === undefined || body.reorderLevel === null) return badRequest("reorderLevel required");
    if (!Number.isInteger(body.reorderLevel) || body.reorderLevel < 0) return badRequest("reorderLevel must be a non-negative integer");

    const inventory = await prisma.inventory.findUnique({ where: { productId } });
    if (!inventory) return notFound();

    const updated = await prisma.inventory.update({
      where: { productId },
      data: { reorderLevel: body.reorderLevel },
    });
    void writeAudit({ action: "UPDATE", entityType: "INVENTORY", entityId: productId, oldValues: { reorderLevel: inventory.reorderLevel }, newValues: { reorderLevel: updated.reorderLevel } });
    return ok(updated);
  } catch (e) { return serverError(e); }
}

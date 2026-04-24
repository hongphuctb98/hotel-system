import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, conflict, serverError } from "@/lib/response";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isActiveParam = searchParams.get("isActive");
    const where = isActiveParam !== null ? { isActive: isActiveParam === "true" } : {};
    const items = await prisma.productCategory.findMany({ where, orderBy: { name: "asc" } });
    return ok(items);
  } catch (e) { return serverError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return badRequest("name required");

    const existing = await prisma.productCategory.findUnique({ where: { name: body.name.trim() } });
    if (existing) {
      if (!existing.isActive) {
        return conflict("An inactive category with this name already exists", "PRODUCT_CATEGORY_INACTIVE_EXISTS", { id: existing.id });
      }
      return conflict("A category with this name already exists", "PRODUCT_CATEGORY_NAME_TAKEN");
    }

    const item = await prisma.productCategory.create({ data: { name: body.name.trim() } });
    void writeAudit({ action: "CREATE", entityType: "PRODUCT_CATEGORY", entityId: item.id, newValues: { name: item.name } });
    return created(item);
  } catch (e) { return serverError(e); }
}

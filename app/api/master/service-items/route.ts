import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, serverError } from "@/lib/response";

export async function GET() {
  try {
    const items = await prisma.serviceItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    return ok(items);
  } catch (e) { return serverError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.code || !body.name) return badRequest("code and name required");
    const item = await prisma.serviceItem.create({ data: { code: body.code, name: body.name, unitPrice: body.unitPrice, unit: body.unit } });
    return created(item);
  } catch (e) { return serverError(e); }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, serverError } from "@/lib/response";

export async function GET() {
  try {
    const items = await prisma.amenity.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    return ok(items);
  } catch (e) { return serverError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.code || !body.name) return badRequest("code and name required");
    const item = await prisma.amenity.create({ data: { code: body.code, name: body.name, icon: body.icon } });
    return created(item);
  } catch (e) { return serverError(e); }
}

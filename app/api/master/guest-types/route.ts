import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, serverError } from "@/lib/response";

export async function GET() {
  try {
    const items = await prisma.guestType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    return ok(items);
  } catch (e) { return serverError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.code || !body.name) return badRequest("code and name required");
    const item = await prisma.guestType.create({ data: { code: body.code, name: body.name, color: body.color ?? "#6b7280" } });
    return created(item);
  } catch (e) { return serverError(e); }
}

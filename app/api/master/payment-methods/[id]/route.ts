import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/response";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const body = await req.json();
    const item = await prisma.paymentMethod.update({ where: { id }, data: { code: body.code, name: body.name, isActive: body.isActive } });
    return ok(item);
  } catch (e) { return serverError(e); }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    await prisma.paymentMethod.update({ where: { id }, data: { isActive: false } });
    return ok({ id });
  } catch (e) { return serverError(e); }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const lowStock = searchParams.get("lowStock") === "true";
    const search = searchParams.get("search");

    const items = await prisma.inventory.findMany({
      where: {
        product: {
          isActive: true,
          ...(categoryId && { categoryId }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          }),
        },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
      orderBy: { product: { name: "asc" } },
    });

    const filtered = lowStock
      ? items.filter((i) => i.reorderLevel > 0 && i.quantity < i.reorderLevel)
      : items;

    return ok(filtered);
  } catch (e) { return serverError(e); }
}

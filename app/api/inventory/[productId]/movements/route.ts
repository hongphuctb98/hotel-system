import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, badRequest, conflict, notFound, serverError } from "@/lib/response";
import { getAuthUser } from "@/lib/auth";
import { StockMovementType, StockMovementReason } from "@/prisma/generated/client";

const STAFF_INCLUDE = { createdBy: { select: { id: true, staff: { select: { name: true } } } } } as const;

export async function GET(req: NextRequest, props: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await props.params;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") ?? "20"));
    const type = searchParams.get("type") as StockMovementType | null;
    const reason = searchParams.get("reason") as StockMovementReason | null;

    const where = {
      productId,
      ...(type && { type }),
      ...(reason && { reason }),
    };

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: STAFF_INCLUDE,
      }),
    ]);

    return ok(movements, { total, page, limit: pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (e) { return serverError(e); }
}

export async function POST(req: NextRequest, props: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await props.params;
    const user = await getAuthUser();
    if (!user) return badRequest("Unauthorized");

    const body = await req.json();

    if (!body.type || !Object.values(StockMovementType).includes(body.type)) {
      return badRequest("type must be IN, OUT, or ADJUST");
    }
    if (!body.reason || !Object.values(StockMovementReason).includes(body.reason)) {
      return badRequest("reason required");
    }
    if (body.quantity === undefined || body.quantity === null || !Number.isInteger(body.quantity) || body.quantity < 0) {
      return badRequest("quantity must be a non-negative integer");
    }

    const inventory = await prisma.inventory.findUnique({ where: { productId } });
    if (!inventory) return notFound();

    const type: StockMovementType = body.type;

    // ADJUST: body.quantity is the new absolute total → compute delta
    // IN: add body.quantity
    // OUT: subtract body.quantity (must be > 0)
    let signedQty: number;
    if (type === StockMovementType.ADJUST) {
      signedQty = body.quantity - inventory.quantity;
    } else if (type === StockMovementType.IN) {
      if (body.quantity <= 0) return badRequest("quantity must be greater than 0 for IN");
      signedQty = body.quantity;
    } else {
      if (body.quantity <= 0) return badRequest("quantity must be greater than 0 for OUT");
      signedQty = -body.quantity;
      if (inventory.quantity + signedQty < 0) {
        return conflict(
          `Insufficient stock. Only ${inventory.quantity} available.`,
          "INSUFFICIENT_STOCK",
          { available: inventory.quantity }
        );
      }
    }

    const isStocktake = body.reason === StockMovementReason.STOCKTAKE;

    const movement = await prisma.$transaction(async (tx) => {
      const mv = await tx.stockMovement.create({
        data: {
          productId,
          type,
          quantity: signedQty,
          reason: body.reason as StockMovementReason,
          refType: body.refType ?? null,
          refId: body.refId ?? null,
          note: body.note ?? null,
          createdById: user.sub,
        },
        include: STAFF_INCLUDE,
      });
      await tx.inventory.update({
        where: { productId },
        data: {
          quantity: { increment: signedQty },
          ...(isStocktake && { lastStocktakeAt: new Date() }),
        },
      });
      return mv;
    });

    return created(movement);
  } catch (e) { return serverError(e); }
}

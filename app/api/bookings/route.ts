import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, created, serverError } from "@/lib/response";
import { parseQueryParams } from "@/common/utils/queryParams";

const bookingInclude = {
  guest: { include: { guestType: true } },
  room: { include: { floor: true, roomType: true, roomStatus: true } },
  bookingStatus: true,
  services: { include: { serviceItem: true } },
  invoices: true,
};

export async function GET(req: NextRequest) {
  try {
    const { page, limit, search, filters } = parseQueryParams(req.nextUrl.searchParams);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.bookingStatusId) where.bookingStatusId = filters.bookingStatusId;
    if (search) {
      where.guest = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: bookingInclude,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.count({ where }),
    ]);

    return ok(bookings, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nights = Math.max(
      1,
      Math.ceil(
        (new Date(body.checkOutDate).getTime() -
          new Date(body.checkInDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    const totalAmount = nights * body.ratePerNight;

    const booking = await prisma.booking.create({
      data: {
        guestId: body.guestId,
        roomId: body.roomId,
        bookingStatusId: body.bookingStatusId,
        checkInDate: new Date(body.checkInDate),
        checkOutDate: new Date(body.checkOutDate),
        adults: body.adults ?? 1,
        children: body.children ?? 0,
        ratePerNight: body.ratePerNight,
        totalAmount,
        depositAmount: body.depositAmount ?? 0,
        source: body.source,
        note: body.note,
      },
      include: bookingInclude,
    });
    return created(booking);
  } catch (e) {
    return serverError(e);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/response";

export async function GET(_req: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayPayments, totalRooms, occupiedBookings, cleaningTasks, upcomingCheckIns, upcomingCheckOuts] =
      await Promise.all([
        prisma.payment.aggregate({
          where: { paidAt: { gte: today, lt: tomorrow } },
          _sum: { amount: true },
        }),
        prisma.room.count({ where: { isActive: true } }),
        prisma.booking.count({
          where: {
            bookingStatus: { code: { in: ["CHECKED_IN"] } },
          },
        }),
        prisma.housekeepingTask.count({
          where: { status: { in: ["PENDING", "IN_PROGRESS"] }, type: "CLEAN" },
        }),
        prisma.booking.findMany({
          where: {
            checkInDate: { gte: today, lt: tomorrow },
            bookingStatus: { code: { in: ["CONFIRMED", "PENDING"] } },
          },
          include: { guest: true, room: true },
          take: 5,
          orderBy: { checkInDate: "asc" },
        }) as Promise<{ id: string; checkInDate: Date; guest: { firstName: string; lastName: string }; room: { number: string } }[]>,
        prisma.booking.findMany({
          where: {
            checkOutDate: { gte: today, lt: tomorrow },
            bookingStatus: { code: "CHECKED_IN" },
          },
          include: { guest: true, room: true },
          take: 5,
          orderBy: { checkOutDate: "asc" },
        }) as Promise<{ id: string; checkOutDate: Date; guest: { firstName: string; lastName: string }; room: { number: string } }[]>,
      ]);

    const occupancyRate =
      totalRooms > 0 ? Math.round((occupiedBookings / totalRooms) * 100) : 0;

    return ok({
      todayRevenue: Number(todayPayments._sum.amount ?? 0),
      occupancyRate,
      currentGuests: occupiedBookings,
      roomsNeedCleaning: cleaningTasks,
      weeklyRevenue: [],
      upcomingCheckIns: (upcomingCheckIns as { id: string; checkInDate: Date; guest: { firstName: string; lastName: string }; room: { number: string } }[]).map((b) => ({
        id: b.id,
        guestName: `${b.guest.firstName} ${b.guest.lastName}`,
        roomNumber: b.room.number,
        checkInDate: b.checkInDate.toISOString(),
      })),
      upcomingCheckOuts: (upcomingCheckOuts as { id: string; checkOutDate: Date; guest: { firstName: string; lastName: string }; room: { number: string } }[]).map((b) => ({
        id: b.id,
        guestName: `${b.guest.firstName} ${b.guest.lastName}`,
        roomNumber: b.room.number,
        checkOutDate: b.checkOutDate.toISOString(),
      })),
    });
  } catch (e) {
    return serverError(e);
  }
}

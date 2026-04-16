import { NextRequest } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/response";
import { getHotelTimezone, hotelLocalDate, buildLocalDayBoundsUTC } from "@/common/utils/hotelDate";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") === "30d" ? 30 : 7;

    const tz = await getHotelTimezone();
    const todayStr = await hotelLocalDate();
    const { start: todayStart, end: todayEnd } = await buildLocalDayBoundsUTC(todayStr);

    // Compute start of the revenue window
    const periodStartStr = dayjs.tz(todayStr, tz).subtract(period - 1, "day").format("YYYY-MM-DD");
    const { start: periodStart } = await buildLocalDayBoundsUTC(periodStartStr);

    // Previous equivalent period bounds
    const prevPeriodStartStr = dayjs.tz(todayStr, tz).subtract(2 * period - 1, "day").format("YYYY-MM-DD");
    const prevPeriodEndStr = dayjs.tz(todayStr, tz).subtract(period, "day").format("YYYY-MM-DD");
    const { start: prevPeriodStart } = await buildLocalDayBoundsUTC(prevPeriodStartStr);
    const { end: prevPeriodEnd } = await buildLocalDayBoundsUTC(prevPeriodEndStr);

    const [
      totalRooms,
      occupiedBookings,
      cleaningRooms,
      periodPayments,
      prevPeriodPaymentSum,
      scheduledTodayInvoices,
      roomStatuses,
      todayArrivalsRaw,
      todayDeparturesRaw,
      housekeepingPending,
      housekeepingInProgress,
      housekeepingCompletedToday,
    ] = await Promise.all([
      // Total active rooms
      prisma.room.count({ where: { isActive: true } }),
      // Currently occupied bookings
      prisma.booking.count({
        where: { bookingStatus: { code: { in: ["CHECKED_IN"] } } },
      }),
      // Rooms in post-checkout CLEANING state (derived from room status, not tasks)
      prisma.room.count({
        where: { isActive: true, roomStatus: { code: "CLEANING" } },
      }),
      // All payments in the revenue period (used for chart + period total)
      prisma.payment.findMany({
        where: { paidAt: { gte: periodStart, lte: todayEnd } },
        select: { paidAt: true, amount: true },
      }),
      // Previous equivalent period total (for % change)
      prisma.payment.aggregate({
        where: { paidAt: { gte: prevPeriodStart, lte: prevPeriodEnd } },
        _sum: { amount: true },
      }),
      // Unpaid invoices for today's expected checkouts (scheduled revenue)
      prisma.invoice.aggregate({
        where: {
          isPaid: false,
          booking: {
            checkOutDate: { gte: todayStart, lt: todayEnd },
            bookingStatus: { code: "CHECKED_IN" },
          },
        },
        _sum: { totalAmount: true },
      }),
      // Room status breakdown
      prisma.roomStatus.findMany({
        where: { code: { in: ["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE"] } },
        include: {
          rooms: { where: { isActive: true }, select: { id: true } },
        },
        orderBy: { code: "asc" },
      }),
      // Today's arrivals (CONFIRMED or PENDING, check-in today)
      prisma.booking.findMany({
        where: {
          checkInDate: { gte: todayStart, lte: todayEnd },
          bookingStatus: { code: { in: ["CONFIRMED", "PENDING"] } },
        },
        include: { guest: true, room: true },
        take: 10,
        orderBy: { checkInDate: "asc" },
      }),
      // Today's departures (CHECKED_IN, check-out today)
      prisma.booking.findMany({
        where: {
          checkOutDate: { gte: todayStart, lte: todayEnd },
          bookingStatus: { code: "CHECKED_IN" },
        },
        include: { guest: true, room: true },
        take: 10,
        orderBy: { checkOutDate: "asc" },
      }),
      // Housekeeping counts
      prisma.housekeepingTask.count({ where: { status: "PENDING" } }),
      prisma.housekeepingTask.count({ where: { status: "IN_PROGRESS" } }),
      prisma.housekeepingTask.count({
        where: { status: "COMPLETED", updatedAt: { gte: todayStart, lte: todayEnd } },
      }),
    ]);

    // Build revenueByDay: group period payments by hotel-local date
    const revenueMap: Record<string, number> = {};
    for (const p of periodPayments) {
      const dayKey = dayjs(p.paidAt).tz(tz).format("YYYY-MM-DD");
      revenueMap[dayKey] = (revenueMap[dayKey] ?? 0) + Number(p.amount);
    }
    // Fill in all days in the period (including zeros)
    const revenueByDay: { date: string; revenue: number }[] = [];
    for (let i = period - 1; i >= 0; i--) {
      const dateStr = dayjs.tz(todayStr, tz).subtract(i, "day").format("YYYY-MM-DD");
      revenueByDay.push({ date: dateStr, revenue: revenueMap[dateStr] ?? 0 });
    }

    // Period revenue totals
    const periodRevenue = periodPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const prevPeriodRevenue = Number(prevPeriodPaymentSum._sum.amount ?? 0);
    const revenueChangePercent =
      prevPeriodRevenue > 0
        ? Math.round(((periodRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 1000) / 10
        : null;

    const scheduledTodayRevenue = Number(scheduledTodayInvoices._sum.totalAmount ?? 0);

    // Room status counts
    const roomStatusCounts = roomStatuses.map((rs) => ({
      code: rs.code,
      name: rs.name,
      color: rs.color ?? "#888",
      count: rs.rooms.length,
    }));

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedBookings / totalRooms) * 100) : 0;

    type BookingWithRelations = {
      id: string;
      checkInDate: Date;
      checkOutDate: Date;
      guest: { firstName: string; lastName: string };
      room: { number: string };
    };

    return ok({
      periodRevenue,
      scheduledTodayRevenue,
      revenueChangePercent,
      occupancyRate,
      currentGuests: occupiedBookings,
      roomsNeedCleaning: cleaningRooms,
      revenueByDay,
      roomStatusCounts,
      todayArrivals: (todayArrivalsRaw as BookingWithRelations[]).map((b) => ({
        id: b.id,
        guestName: `${b.guest.firstName} ${b.guest.lastName}`,
        roomNumber: b.room.number,
        scheduledTime: b.checkInDate.toISOString(),
      })),
      todayDepartures: (todayDeparturesRaw as BookingWithRelations[]).map((b) => ({
        id: b.id,
        guestName: `${b.guest.firstName} ${b.guest.lastName}`,
        roomNumber: b.room.number,
        scheduledTime: b.checkOutDate.toISOString(),
      })),
      housekeepingCounts: {
        pending: housekeepingPending,
        inProgress: housekeepingInProgress,
        completedToday: housekeepingCompletedToday,
      },
    });
  } catch (e) {
    return serverError(e);
  }
}

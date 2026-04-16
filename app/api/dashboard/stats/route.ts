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

    const [
      totalRooms,
      occupiedBookings,
      cleaningRooms,
      periodPayments,
      todayCheckoutsPaid,
      todayCheckoutsExpected,
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
      // Today's checkout revenue — already paid (invoice.isPaid = true)
      prisma.invoice.aggregate({
        where: {
          isPaid: true,
          booking: {
            checkOutDate: { gte: todayStart, lte: todayEnd },
            bookingStatus: { code: { in: ["CHECKED_IN", "CHECKED_OUT"] } },
          },
        },
        _sum: { totalAmount: true },
      }),
      // Today's checkout revenue — total expected (all active checkouts today)
      prisma.invoice.aggregate({
        where: {
          booking: {
            checkOutDate: { gte: todayStart, lte: todayEnd },
            bookingStatus: { code: { in: ["CHECKED_IN", "CHECKED_OUT"] } },
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

    // Period revenue total (used by chart)
    const periodRevenue = periodPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Today's checkout payment KPI
    const todayPaidRevenue     = Number(todayCheckoutsPaid._sum.totalAmount     ?? 0);
    const todayExpectedRevenue = Number(todayCheckoutsExpected._sum.totalAmount ?? 0);
    const todayRevenuePercent  =
      todayExpectedRevenue > 0
        ? Math.round((todayPaidRevenue / todayExpectedRevenue) * 1000) / 10
        : null;

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
      todayPaidRevenue,
      todayExpectedRevenue,
      todayRevenuePercent,
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

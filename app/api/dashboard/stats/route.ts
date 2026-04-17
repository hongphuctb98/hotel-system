import { NextRequest } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { buildBookingInclude, roomBaseInclude, toRoomDTO } from "@/app/api/rooms/_utils";
import { ROOM_DISPLAY_STATUS_ORDER, resolveRoomDisplayStatusCode } from "@/common/utils/roomDisplayStatus";
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
    const roomInclude = { ...roomBaseInclude, ...await buildBookingInclude(todayStr) };

    // Compute start of the revenue window
    const periodStartStr = dayjs.tz(todayStr, tz).subtract(period - 1, "day").format("YYYY-MM-DD");
    const { start: periodStart } = await buildLocalDayBoundsUTC(periodStartStr);

    const [
      totalRooms,
      occupiedBookings,
      todayCheckInBookings,
      cleaningRooms,
      periodPayments,
      todayCheckoutsExpected,
      dashboardRoomStatuses,
      checkedOutStatus,
      dashboardRoomsRaw,
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
      // Today's check-ins (bookings scheduled to arrive today)
      prisma.booking.count({
        where: {
          checkInDate: { gte: todayStart, lte: todayEnd },
          bookingStatus: { code: { in: ["CONFIRMED", "PENDING"] } },
        },
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
      // Today's expected revenue — sum of invoice totals for bookings checking out today.
      // Uses Invoice.totalAmount (not isPaid) so partial payments are included in the estimate.
      // Actual collected may exceed this when payments from other bookings also land today.
      prisma.invoice.aggregate({
        where: {
          booking: {
            checkOutDate: { gte: todayStart, lte: todayEnd },
            bookingStatus: { code: { in: ["CHECKED_IN", "CHECKED_OUT"] } },
          },
        },
        _sum: { totalAmount: true },
      }),
      // Shared display-status metadata used by room-map / rooms / dashboard
      prisma.roomStatus.findMany({
        where: { code: { in: ROOM_DISPLAY_STATUS_ORDER.filter((code) => code !== "CHECKED_OUT") } },
        select: { code: true, name: true, color: true },
      }),
      prisma.bookingStatus.findFirst({
        where: { code: "CHECKED_OUT" },
        select: { code: true, name: true, color: true },
      }),
      prisma.room.findMany({
        where: { isActive: true },
        include: roomInclude,
      }),
      // Today's arrivals (CONFIRMED or PENDING, check-in today)
      prisma.booking.findMany({
        where: {
          checkInDate: { gte: todayStart, lte: todayEnd },
          bookingStatus: { code: { in: ["CONFIRMED", "PENDING"] } },
        },
        include: {
          guest: true,
          room: { include: { roomType: true } },
          invoices: { include: { payments: true } },
        },
        take: 50,
        orderBy: { checkInDate: "asc" },
      }),
      // Today's departures (CHECKED_IN, check-out today)
      prisma.booking.findMany({
        where: {
          checkOutDate: { gte: todayStart, lte: todayEnd },
          bookingStatus: { code: "CHECKED_IN" },
        },
        include: {
          guest: true,
          room: { include: { roomType: true } },
          invoices: { include: { payments: true } },
        },
        take: 50,
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

    // Actual revenue: sum of real payments received in the period
    const periodRevenue = periodPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Estimated revenue today: total invoice amounts for today's checkouts
    const todayExpectedRevenue = Number(todayCheckoutsExpected._sum.totalAmount ?? 0);

    // Room status counts must match the current status shown on room-map cards.
    const dashboardRooms = dashboardRoomsRaw.map(toRoomDTO);
    const statusMeta = new Map(
      [...dashboardRoomStatuses, ...(checkedOutStatus ? [checkedOutStatus] : [])].map((status) => [
        status.code,
        status,
      ]),
    );
    const roomStatusCountsMap = new Map<string, number>(
      ROOM_DISPLAY_STATUS_ORDER.map((code) => [code, 0]),
    );

    for (const room of dashboardRooms) {
      const code = resolveRoomDisplayStatusCode(room);
      roomStatusCountsMap.set(code, (roomStatusCountsMap.get(code) ?? 0) + 1);
    }

    const roomStatusCounts = ROOM_DISPLAY_STATUS_ORDER.map((code) => {
      const meta = statusMeta.get(code);
      return {
        code,
        name: meta?.name ?? code,
        color: meta?.color ?? "#888",
        count: roomStatusCountsMap.get(code) ?? 0,
      };
    });

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedBookings / totalRooms) * 100) : 0;

    type BookingWithRelations = {
      id: string;
      checkInDate: Date;
      checkOutDate: Date;
      guest: { firstName: string; lastName: string };
      room: { number: string; roomType: { name: string } };
      invoices: { totalAmount: number; payments: { amount: number }[] }[];
    };

    function toBookingDTO(b: BookingWithRelations) {
      const invoice = b.invoices[0];
      const totalAmount = Number(invoice?.totalAmount ?? 0);
      const paidAmount = (invoice?.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
      const dueAmount = Math.max(0, totalAmount - paidAmount);
      const paymentStatus =
        totalAmount === 0 ? "UNPAID"
        : dueAmount <= 0 ? "PAID"
        : paidAmount > 0 ? "PARTIAL"
        : "UNPAID";
      return {
        id: b.id,
        guestName: `${b.guest.firstName} ${b.guest.lastName}`,
        roomNumber: b.room.number,
        roomType: b.room.roomType.name,
        checkInDate: b.checkInDate.toISOString(),
        checkOutDate: b.checkOutDate.toISOString(),
        paidAmount,
        totalAmount,
        dueAmount,
        paymentStatus,
      };
    }

    return ok({
      periodRevenue,
      todayExpectedRevenue,
      totalRooms,
      occupancyRate,
      todayCheckinCount: todayCheckInBookings,
      roomsNeedCleaning: cleaningRooms,
      todayCheckoutsCount: todayDeparturesRaw.length,
      revenueByDay,
      roomStatusCounts,
      todayArrivals: (todayArrivalsRaw as unknown as BookingWithRelations[]).map(toBookingDTO),
      todayDepartures: (todayDeparturesRaw as unknown as BookingWithRelations[]).map(toBookingDTO),
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

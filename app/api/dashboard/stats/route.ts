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

const DASHBOARD_CHECKED_OUT_COLOR = "#b37feb";

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

    // Yesterday's UTC bounds — derived from already-fetched timezone, no extra await
    const yesterdayStr = dayjs.tz(todayStr, tz).subtract(1, "day").format("YYYY-MM-DD");
    const yesterdayStart = dayjs.tz(yesterdayStr, tz).startOf("day").toDate();
    const yesterdayEnd = dayjs.tz(yesterdayStr, tz).endOf("day").toDate();

    const [
      totalRooms,
      occupiedBookings,
      todayCheckInBookings,
      cleaningRooms,
      periodPayments,
      dashboardRoomStatuses,
      checkedOutStatus,
      dashboardRoomsRaw,
      todayArrivalsRaw,
      todayDeparturesRaw,
      housekeepingPending,
      housekeepingInProgress,
      housekeepingCompletedToday,
      yesterdayOccupied,
      yesterdayCheckins,
      yesterdayCheckouts,
      tenantBillPayments,
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
      // Today's departures — include any non-cancelled booking scheduled to
      // check out today so hourly/daily same-day stays are counted even before
      // they transition to CHECKED_IN.
      prisma.booking.findMany({
        where: {
          checkOutDate: { gte: todayStart, lte: todayEnd },
          bookingStatus: { code: { notIn: ["CANCELLED", "NO_SHOW"] } },
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
      // Yesterday — bookings occupying a room (for occupancy rate comparison)
      prisma.booking.count({
        where: {
          checkInDate: { lte: yesterdayEnd },
          checkOutDate: { gte: yesterdayStart },
          bookingStatus: { code: { in: ["CHECKED_IN", "CHECKED_OUT"] } },
        },
      }),
      // Yesterday — check-ins (arrived yesterday, now CHECKED_IN or CHECKED_OUT)
      prisma.booking.count({
        where: {
          checkInDate: { gte: yesterdayStart, lte: yesterdayEnd },
          bookingStatus: { code: { in: ["CHECKED_IN", "CHECKED_OUT"] } },
        },
      }),
      // Yesterday — bookings scheduled to check out yesterday, excluding
      // cancelled / no-show. Mirrors today's departures logic.
      prisma.booking.count({
        where: {
          checkOutDate: { gte: yesterdayStart, lte: yesterdayEnd },
          bookingStatus: { code: { notIn: ["CANCELLED", "NO_SHOW"] } },
        },
      }),
      // Long-term rental payments in the revenue period
      prisma.tenantBillPayment.findMany({
        where: { paymentDate: { gte: periodStart, lte: todayEnd } },
        select: { paymentDate: true, amount: true },
      }),
    ]);

    // Build revenueByDay: group period payments by hotel-local date (short-term + long-term)
    const revenueMap: Record<string, number> = {};
    for (const p of periodPayments) {
      const dayKey = dayjs(p.paidAt).tz(tz).format("YYYY-MM-DD");
      revenueMap[dayKey] = (revenueMap[dayKey] ?? 0) + Number(p.amount);
    }
    for (const p of tenantBillPayments) {
      const dayKey = dayjs(p.paymentDate).tz(tz).format("YYYY-MM-DD");
      revenueMap[dayKey] = (revenueMap[dayKey] ?? 0) + Number(p.amount);
    }
    // Fill in all days in the period (including zeros)
    const revenueByDay: { date: string; revenue: number }[] = [];
    for (let i = period - 1; i >= 0; i--) {
      const dateStr = dayjs.tz(todayStr, tz).subtract(i, "day").format("YYYY-MM-DD");
      revenueByDay.push({ date: dateStr, revenue: revenueMap[dateStr] ?? 0 });
    }

    // Returns null when previous value is 0 (division not meaningful)
    function dayOverDay(today: number, yesterday: number): number | null {
      if (yesterday === 0) return null;
      return Math.round(((today - yesterday) / yesterday) * 100);
    }

    // Actual revenue: sum of real payments received in the period (short-term + long-term)
    const periodRevenue =
      periodPayments.reduce((sum, p) => sum + Number(p.amount), 0) +
      tenantBillPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Money actually collected today and yesterday — derived from revenueMap already built above
    const todayCollected = revenueMap[todayStr] ?? 0;
    const yesterdayCollected = revenueMap[yesterdayStr] ?? 0;

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
        color: code === "CHECKED_OUT" ? DASHBOARD_CHECKED_OUT_COLOR : meta?.color ?? "#888",
        count: roomStatusCountsMap.get(code) ?? 0,
      };
    });

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedBookings / totalRooms) * 100) : 0;
    const yesterdayOccupancyRate = totalRooms > 0 ? Math.round((yesterdayOccupied / totalRooms) * 100) : 0;

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
      todayCollected,
      yesterdayCollected,
      totalRooms,
      occupancyRate,
      occupancyRateChange: dayOverDay(occupancyRate, yesterdayOccupancyRate),
      todayCheckinCount: todayCheckInBookings,
      todayCheckinChange: dayOverDay(todayCheckInBookings, yesterdayCheckins),
      roomsNeedCleaning: cleaningRooms,
      todayCheckoutsCount: todayDeparturesRaw.length,
      todayCheckoutsChange: dayOverDay(todayDeparturesRaw.length, yesterdayCheckouts),
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

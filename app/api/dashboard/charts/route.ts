import { NextRequest } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/response";
import { getHotelTimezone, hotelLocalDate, buildLocalDayBoundsUTC } from "@/common/utils/hotelDate";

dayjs.extend(utc);
dayjs.extend(timezone);

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  CASH: "#52c41a",
  CREDIT_CARD: "#1677ff",
  BANK_TRANSFER: "#722ed1",
  QR_PAYMENT: "#13c2c2",
};

const FALLBACK_PAYMENT_COLORS = [
  "#378ADD", "#52c41a", "#fa8c16", "#722ed1",
  "#13c2c2", "#f5222d", "#eb2f96", "#faad14",
];

export async function GET(_req: NextRequest) {
  try {
    const tz = await getHotelTimezone();
    const todayStr = await hotelLocalDate();
    const { end: todayEnd } = await buildLocalDayBoundsUTC(todayStr);

    // 30-day window (for trends + room type chart)
    const day30Str = dayjs.tz(todayStr, tz).subtract(29, "day").format("YYYY-MM-DD");
    const day30Start = dayjs.tz(day30Str, tz).startOf("day").toDate();

    // 56-day window (8 weeks for occupancy trend)
    const week8Str = dayjs.tz(todayStr, tz).subtract(55, "day").format("YYYY-MM-DD");
    const week8Start = dayjs.tz(week8Str, tz).startOf("day").toDate();

    const [
      totalRooms,
      checkinCheckoutBookings,
      revenuePayments,
      roomTypeBookings,
      paymentMethodPayments,
      occupancyBookings,
      newBookingsRaw,
    ] = await Promise.all([
      prisma.room.count({ where: { isActive: true } }),

      // Bookings with checkIn or checkOut in last 30 days (for trend lines)
      prisma.booking.findMany({
        where: {
          OR: [
            { checkInDate: { gte: day30Start, lte: todayEnd } },
            { checkOutDate: { gte: day30Start, lte: todayEnd } },
          ],
          bookingStatus: { code: { notIn: ["CANCELLED", "NO_SHOW"] } },
        },
        select: { checkInDate: true, checkOutDate: true },
      }),

      // Payments in last 30 days — linked to room type for revenue breakdown
      prisma.payment.findMany({
        where: { paidAt: { gte: day30Start, lte: todayEnd } },
        select: {
          amount: true,
          invoice: {
            select: {
              booking: {
                select: {
                  room: { select: { roomType: { select: { name: true } } } },
                },
              },
            },
          },
        },
      }),

      // Bookings started in last 30 days — for booking count by room type
      prisma.booking.findMany({
        where: {
          checkInDate: { gte: day30Start, lte: todayEnd },
          bookingStatus: { code: { notIn: ["CANCELLED", "NO_SHOW"] } },
        },
        select: {
          room: { select: { roomType: { select: { name: true } } } },
        },
      }),

      // Payments in last 30 days grouped by payment method
      prisma.payment.findMany({
        where: { paidAt: { gte: day30Start, lte: todayEnd } },
        select: {
          amount: true,
          paymentMethod: { select: { code: true, name: true } },
        },
      }),

      // All bookings that overlap the 8-week window (for occupancy trend)
      prisma.booking.findMany({
        where: {
          checkInDate: { lte: todayEnd },
          checkOutDate: { gte: week8Start },
          bookingStatus: { code: { notIn: ["CANCELLED", "NO_SHOW"] } },
        },
        select: { checkInDate: true, checkOutDate: true },
      }),

      // Bookings created in last 30 days (createdAt, not checkInDate)
      prisma.booking.findMany({
        where: { createdAt: { gte: day30Start, lte: todayEnd } },
        select: { createdAt: true },
      }),
    ]);

    // ── 1. Check-in vs Check-out trend (last 30 days) ─────────────────────
    const checkinMap: Record<string, number> = {};
    const checkoutMap: Record<string, number> = {};
    for (const b of checkinCheckoutBookings) {
      const ciDay = dayjs(b.checkInDate).tz(tz).format("YYYY-MM-DD");
      const coDay = dayjs(b.checkOutDate).tz(tz).format("YYYY-MM-DD");
      if (ciDay >= day30Str && ciDay <= todayStr)
        checkinMap[ciDay] = (checkinMap[ciDay] ?? 0) + 1;
      if (coDay >= day30Str && coDay <= todayStr)
        checkoutMap[coDay] = (checkoutMap[coDay] ?? 0) + 1;
    }
    const checkinCheckoutByDay: { date: string; checkins: number; checkouts: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dateStr = dayjs.tz(todayStr, tz).subtract(i, "day").format("YYYY-MM-DD");
      checkinCheckoutByDay.push({
        date: dateStr,
        checkins: checkinMap[dateStr] ?? 0,
        checkouts: checkoutMap[dateStr] ?? 0,
      });
    }

    // ── 2. Revenue & bookings by room type ────────────────────────────────
    const revenueByType: Record<string, number> = {};
    for (const p of revenuePayments) {
      const name = p.invoice?.booking?.room?.roomType?.name;
      if (name) revenueByType[name] = (revenueByType[name] ?? 0) + Number(p.amount);
    }
    const bookingsByType: Record<string, number> = {};
    for (const b of roomTypeBookings) {
      const name = b.room?.roomType?.name;
      if (name) bookingsByType[name] = (bookingsByType[name] ?? 0) + 1;
    }
    const allRoomTypes = new Set([...Object.keys(revenueByType), ...Object.keys(bookingsByType)]);
    const revenueAndBookingsByRoomType = Array.from(allRoomTypes).map((name) => ({
      roomType: name,
      revenue: revenueByType[name] ?? 0,
      bookings: bookingsByType[name] ?? 0,
    }));

    // ── 3. Payment method breakdown ───────────────────────────────────────
    const methodAmount: Record<string, number> = {};
    const methodCount: Record<string, number> = {};
    const methodCodeByName: Record<string, string> = {};
    for (const p of paymentMethodPayments) {
      const name = p.paymentMethod?.name ?? "Other";
      const code = p.paymentMethod?.code ?? "OTHER";
      methodAmount[name] = (methodAmount[name] ?? 0) + Number(p.amount);
      methodCount[name] = (methodCount[name] ?? 0) + 1;
      methodCodeByName[name] = code;
    }
    const paymentMethodBreakdown = Object.entries(methodAmount).map(([methodName, amount], idx) => {
      const methodCode = methodCodeByName[methodName] ?? "OTHER";
      return {
        methodCode,
        methodName,
        amount,
        count: methodCount[methodName] ?? 0,
        color: PAYMENT_METHOD_COLORS[methodCode] ?? FALLBACK_PAYMENT_COLORS[idx % FALLBACK_PAYMENT_COLORS.length],
      };
    });

    // ── 4. Occupancy rate by week (last 8 weeks) ──────────────────────────
    // Week i=0 oldest, i=7 is current week
    const occupancyByWeek: { weekLabel: string; occupancyRate: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekEndDjs  = dayjs.tz(todayStr, tz).subtract(i * 7, "day");
      const weekStartDjs = weekEndDjs.subtract(6, "day");
      const weekStartUTC = weekStartDjs.startOf("day").toDate();
      const weekEndUTC   = weekEndDjs.endOf("day").toDate();

      // Compute room-days occupied in this 7-day window
      let totalRoomDays = 0;
      for (const b of occupancyBookings) {
        const ciMs = Math.max(b.checkInDate.getTime(), weekStartUTC.getTime());
        const coMs = Math.min(b.checkOutDate.getTime(), weekEndUTC.getTime());
        if (coMs > ciMs) {
          totalRoomDays += (coMs - ciMs) / (1000 * 60 * 60 * 24);
        }
      }
      const rate = totalRooms > 0
        ? Math.min(100, Math.round((totalRoomDays / (7 * totalRooms)) * 100))
        : 0;

      occupancyByWeek.push({
        weekLabel: weekStartDjs.format("MMM D"),
        occupancyRate: rate,
      });
    }

    // ── 5. Daily new bookings (last 30 days, by createdAt) ────────────────
    const createdMap: Record<string, number> = {};
    for (const b of newBookingsRaw) {
      const dayKey = dayjs(b.createdAt).tz(tz).format("YYYY-MM-DD");
      createdMap[dayKey] = (createdMap[dayKey] ?? 0) + 1;
    }
    const dailyNewBookings: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dateStr = dayjs.tz(todayStr, tz).subtract(i, "day").format("YYYY-MM-DD");
      dailyNewBookings.push({ date: dateStr, count: createdMap[dateStr] ?? 0 });
    }

    return ok({
      checkinCheckoutByDay,
      revenueAndBookingsByRoomType,
      paymentMethodBreakdown,
      occupancyByWeek,
      dailyNewBookings,
      totalRooms,
    });
  } catch (e) {
    return serverError(e);
  }
}

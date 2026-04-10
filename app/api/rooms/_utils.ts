import type { BookingState } from "@/types/room.types";

/** Build UTC day-boundary Date objects from a YYYY-MM-DD string */
export function buildDateBounds(dateStr: string) {
  const start = new Date(dateStr);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Prisma `include` that attaches the one booking overlapping `date` to a room.
 * Excludes CANCELLED / NO_SHOW. Picks the most-recently-created one if multiple overlap.
 */
export function buildBookingInclude(date: string) {
  const { start, end } = buildDateBounds(date);
  return {
    bookings: {
      where: {
        checkInDate: { lte: end },
        checkOutDate: { gte: start },
        bookingStatus: { code: { notIn: ["CANCELLED", "NO_SHOW"] } },
      },
      take: 1,
      orderBy: { createdAt: "desc" as const },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            idNumber: true,
          },
        },
        bookingStatus: { select: { id: true, code: true, name: true, color: true } },
        // Load the earliest invoice's earliest payment so we can prefill paymentMethodId.
        invoices: {
          take: 1,
          orderBy: { createdAt: "asc" as const },
          include: {
            payments: {
              take: 1,
              orderBy: { paidAt: "asc" as const },
              select: { paymentMethodId: true },
            },
          },
        },
      },
    },
  };
}

/** Base room relations included on every room response (no booking) */
export const roomBaseInclude = {
  floor: true,
  roomType: { include: { pricing: true } },
  roomStatus: true,
  amenities: { include: { amenity: true } },
  images: { orderBy: { order: "asc" as const } },
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deriveBookingState(booking: any): BookingState {
  const code = booking.bookingStatus.code as string;
  if (code === "CHECKED_OUT" || booking.actualCheckOut != null) return "checked_out";
  if (code === "CHECKED_IN" || booking.actualCheckIn != null) return "checked_in";
  return "reserved";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toRoomDTO(room: any) {
  const { bookings, ...rest } = room;
  const booking = bookings?.[0] ?? null;
  if (!booking) return { ...rest, currentBooking: null };
  const {
    guest, bookingStatus, invoices,
    baseRate, depositAmount, discountAmount, surchargeAmount,
    hourlyRatePerHour,
    ...bookingRest
  } = booking;
  const paymentMethodId = invoices?.[0]?.payments?.[0]?.paymentMethodId ?? null;
  return {
    ...rest,
    currentBooking: {
      ...bookingRest,
      baseRate:          baseRate          != null ? Number(baseRate)          : null,
      depositAmount:     depositAmount     != null ? Number(depositAmount)     : null,
      discountAmount:    discountAmount    != null ? Number(discountAmount)    : null,
      surchargeAmount:   surchargeAmount   != null ? Number(surchargeAmount)   : null,
      hourlyRatePerHour: hourlyRatePerHour != null ? Number(hourlyRatePerHour) : null,
      paymentMethodId,
      guest,
      bookingStatus,
      bookingState: deriveBookingState(booking),
    },
  };
}

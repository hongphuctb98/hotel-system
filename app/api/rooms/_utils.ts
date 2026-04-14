import type { BookingState } from "@/types/room.types";
import { buildLocalDayBoundsUTC } from "@/common/utils/hotelDate";

/**
 * Prisma `include` that attaches the one booking overlapping `date` to a room.
 * `date` is a YYYY-MM-DD string in the hotel's local timezone.
 * Excludes CANCELLED / NO_SHOW. Picks the most-recently-created one if multiple overlap.
 */
export function buildBookingInclude(date: string) {
  const { start, end } = buildLocalDayBoundsUTC(date);
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

  // A CHECKED_OUT booking on an AVAILABLE room is a stale same-day record from a
  // completed stay. The room has been cleaned and is ready for the next guest — suppress
  // the old booking so the room renders as a fresh available room everywhere (card body,
  // modal form, stay-mode derivation). A new booking for this room will have a more
  // recent createdAt and will replace this record when it is created.
  const bookingState = deriveBookingState(booking);
  if (bookingState === "checked_out" && rest.roomStatus?.code === "AVAILABLE") {
    return { ...rest, currentBooking: null };
  }
  const {
    guest, bookingStatus,
    baseRate, depositAmount, discountAmount, surchargeAmount,
    hourlyRatePerHour,
    ...bookingRest
  } = booking;
  return {
    ...rest,
    currentBooking: {
      ...bookingRest,
      baseRate:          baseRate          != null ? Number(baseRate)          : null,
      depositAmount:     depositAmount     != null ? Number(depositAmount)     : null,
      discountAmount:    discountAmount    != null ? Number(discountAmount)    : null,
      surchargeAmount:   surchargeAmount   != null ? Number(surchargeAmount)   : null,
      hourlyRatePerHour: hourlyRatePerHour != null ? Number(hourlyRatePerHour) : null,
      paymentMethodId: null,
      guest,
      bookingStatus,
      bookingState: deriveBookingState(booking),
    },
  };
}

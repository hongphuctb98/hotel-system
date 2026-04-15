"use client";

import { bookingService } from "@/common/services/bookingService";
import { useTableQuery } from "@/common/hooks/useTableQuery";
import type { Booking } from "@/types/booking.types";

export type BookingFilters = {
  search?: string;
  bookingStatusId?: string;
  roomTypeId?: string;
  checkInFrom?: string;
  checkInTo?: string;
};

export function useReservations(externalFilters?: BookingFilters) {
  return useTableQuery<Booking, BookingFilters>({
    queryKey: ["bookings"],
    fetcher: ({ page, limit, filters }) =>
      bookingService.findAll({ page, limit, ...filters }),
    externalFilters,
  });
}

"use client";

import { bookingService } from "@/common/services/bookingService";
import { useTableQuery } from "@/common/hooks/useTableQuery";
import type { Booking } from "@/types/booking.types";

type BookingFilters = {
  search?: string;
  bookingStatusId?: string;
  source?: string;
  checkInFrom?: string;
  checkInTo?: string;
};

export function useReservations() {
  return useTableQuery<Booking, BookingFilters>({
    queryKey: ["bookings"],
    fetcher: ({ page, limit, filters }) =>
      bookingService.findAll({ page, limit, ...filters }),
  });
}

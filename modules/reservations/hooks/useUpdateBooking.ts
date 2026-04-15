"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingService } from "@/common/services/bookingService";
import type { Booking } from "@/types/booking.types";

export function useUpdateBooking(id: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Booking>) => bookingService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["bookings", id] });
    },
  });
}

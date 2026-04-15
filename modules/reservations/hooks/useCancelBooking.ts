"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingService } from "@/common/services/bookingService";

export function useCancelBooking(id: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (cancelledStatusId: string) =>
      bookingService.update(id, { bookingStatusId: cancelledStatusId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["bookings", id] });
    },
  });
}

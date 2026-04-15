"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingService, type AddServicePayload } from "@/common/services/bookingService";

export function useReservation(id: string) {
  return useQuery({
    queryKey: ["bookings", id],
    queryFn: () => bookingService.findById(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useReservationActions(id: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["bookings"] });
    qc.invalidateQueries({ queryKey: ["bookings", id] });
  };

  const checkIn = useMutation({
    mutationFn: () => bookingService.checkIn(id),
    onSuccess: invalidate,
  });

  const checkOut = useMutation({
    mutationFn: () => bookingService.checkOut(id),
    onSuccess: invalidate,
  });

  const addService = useMutation({
    mutationFn: (data: AddServicePayload) => bookingService.addService(id, data),
    onSuccess: invalidate,
  });

  const removeService = useMutation({
    mutationFn: (serviceId: string) => bookingService.removeService(id, serviceId),
    onSuccess: invalidate,
  });

  return { checkIn, checkOut, addService, removeService };
}

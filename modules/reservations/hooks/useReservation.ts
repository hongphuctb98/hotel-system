"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingService, type AddServicePayload } from "@/common/services/bookingService";
import { message } from "antd";

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
  const invalidate = () => qc.invalidateQueries({ queryKey: ["bookings", id] });

  const checkIn = useMutation({
    mutationFn: () => bookingService.checkIn(id),
    onSuccess: () => { message.success("Checked in successfully"); invalidate(); },
    onError: (e: Error) => message.error(e.message),
  });

  const checkOut = useMutation({
    mutationFn: () => bookingService.checkOut(id),
    onSuccess: () => { message.success("Checked out successfully"); invalidate(); },
    onError: (e: Error) => message.error(e.message),
  });

  const addService = useMutation({
    mutationFn: (data: AddServicePayload) => bookingService.addService(id, data),
    onSuccess: () => { message.success("Service added"); invalidate(); },
    onError: (e: Error) => message.error(e.message),
  });

  const removeService = useMutation({
    mutationFn: (serviceId: string) => bookingService.removeService(id, serviceId),
    onSuccess: () => { message.success("Service removed"); invalidate(); },
    onError: (e: Error) => message.error(e.message),
  });

  return { checkIn, checkOut, addService, removeService };
}

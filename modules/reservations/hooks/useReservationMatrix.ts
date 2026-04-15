"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/common/services/apiClient";
import type { ApiResponse } from "@/types/api.types";

export type MatrixCell = {
  bookingStatusId: string;
  roomTypeId: string;
  count: number;
};

export type ReservationMatrix = {
  cells: MatrixCell[];
};

export function useReservationMatrix({
  checkInFrom,
  checkInTo,
}: {
  checkInFrom?: string;
  checkInTo?: string;
}) {
  const params = new URLSearchParams();
  if (checkInFrom) params.set("checkInFrom", checkInFrom);
  if (checkInTo) params.set("checkInTo", checkInTo);
  const query = params.toString();

  return useQuery({
    queryKey: ["bookings", "matrix", checkInFrom ?? "", checkInTo ?? ""],
    queryFn: () =>
      apiClient.get<ReservationMatrix>(`/api/bookings/matrix${query ? `?${query}` : ""}`),
    select: (res: ApiResponse<ReservationMatrix>) => res.data,
    staleTime: 30_000,
  });
}

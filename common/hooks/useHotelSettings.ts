"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/common/services/apiClient";

export type HotelSettings = {
  timezone: string;
  hotelName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
};

export function useHotelSettings() {
  return useQuery({
    queryKey: ["hotel-settings"],
    queryFn: () => apiClient.get<HotelSettings>("/api/settings"),
    staleTime: Infinity,
    select: (res) => res.data,
  });
}

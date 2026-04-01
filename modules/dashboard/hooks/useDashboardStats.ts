"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/common/services/apiClient";

export type DashboardStats = {
  todayRevenue: number;
  occupancyRate: number;
  currentGuests: number;
  roomsNeedCleaning: number;
  weeklyRevenue: { date: string; revenue: number }[];
  upcomingCheckIns: {
    id: string;
    guestName: string;
    roomNumber: string;
    checkInDate: string;
  }[];
  upcomingCheckOuts: {
    id: string;
    guestName: string;
    roomNumber: string;
    checkOutDate: string;
  }[];
};

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => apiClient.get<DashboardStats>("/api/dashboard/stats"),
    refetchInterval: 1000 * 60 * 5,
  });
}

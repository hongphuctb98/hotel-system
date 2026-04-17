"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/common/services/apiClient";

export type TodayBookingDTO = {
  id: string;
  guestName: string;
  roomNumber: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  paidAmount: number;
  totalAmount: number;
  dueAmount: number;
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
};

export type DashboardStats = {
  periodRevenue: number;
  todayExpectedRevenue: number;
  totalRooms: number;
  occupancyRate: number;
  todayCheckinCount: number;
  roomsNeedCleaning: number;
  todayCheckoutsCount: number;
  revenueByDay: { date: string; revenue: number }[];
  roomStatusCounts: { code: string; name: string; color: string; count: number }[];
  todayArrivals: TodayBookingDTO[];
  todayDepartures: TodayBookingDTO[];
  housekeepingCounts: { pending: number; inProgress: number; completedToday: number };
};

export function useDashboardStats(period: "7d" | "30d" = "7d") {
  return useQuery({
    queryKey: ["dashboard", "stats", period],
    queryFn: () => apiClient.get<DashboardStats>(`/api/dashboard/stats?period=${period}`),
    refetchInterval: 1000 * 60 * 5,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/common/services/apiClient";

export type DashboardCharts = {
  checkinCheckoutByDay: { date: string; checkins: number; checkouts: number }[];
  revenueAndBookingsByRoomType: { roomType: string; revenue: number; bookings: number }[];
  paymentMethodBreakdown: { methodCode: string; methodName: string; amount: number; count: number; color: string }[];
  occupancyByWeek: { weekLabel: string; occupancyRate: number }[];
  dailyNewBookings: { date: string; count: number }[];
  totalRooms: number;
};

export function useDashboardCharts() {
  return useQuery({
    queryKey: ["dashboard", "charts"],
    queryFn: () => apiClient.get<DashboardCharts>("/api/dashboard/charts"),
    refetchInterval: 1000 * 60 * 10,
  });
}

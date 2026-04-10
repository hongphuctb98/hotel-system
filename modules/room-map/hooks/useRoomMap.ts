"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { roomService } from "@/common/services/roomService";
import type { BookingState } from "@/types/room.types";

export type RoomMapFilters = {
  floorId?: string;
  roomTypeId?: string;
  /** Filter by operational room status (CLEANING, MAINTENANCE, etc.) */
  statusId?: string;
  /** Filter by booking-derived occupancy state — applied client-side after fetch */
  bookingState?: BookingState | "all";
  date: string;
};

export function useRoomMap() {
  const [filters, setFilters] = useState<RoomMapFilters>({
    date: dayjs().format("YYYY-MM-DD"),
    bookingState: "all",
  });

  // Only server-side filter params go into the query key and API call
  const apiFilters = useMemo(() => {
    const { bookingState: _bs, ...rest } = filters;
    return rest;
  }, [filters]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["room-map", apiFilters],
    queryFn: () => roomService.findAll({ ...apiFilters, limit: 200 }),
    refetchInterval: 1000 * 30,
  });

  // Client-side booking state filter
  const rooms = useMemo(() => {
    const all = data?.data ?? [];
    if (!filters.bookingState || filters.bookingState === "all") return all;
    return all.filter(
      (r) => (r.currentBooking?.bookingState ?? "none") === filters.bookingState
    );
  }, [data?.data, filters.bookingState]);

  return {
    rooms,
    isLoading,
    filters,
    setFilters,
    refetch,
  };
}

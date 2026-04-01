"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { roomService } from "@/common/services/roomService";

type RoomMapFilters = {
  floorId?: string;
  roomTypeId?: string;
  statusId?: string;
};

export function useRoomMap() {
  const [filters, setFilters] = useState<RoomMapFilters>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["room-map", filters],
    queryFn: () => roomService.findAll({ ...filters, limit: 200 }),
    refetchInterval: 1000 * 30,
  });

  return {
    rooms: data?.data ?? [],
    isLoading,
    filters,
    setFilters,
    refetch,
  };
}

"use client";

import { roomService } from "@/common/services/roomService";
import { useTableQuery } from "@/common/hooks/useTableQuery";
import type { Room } from "@/types/room.types";

type RoomFilters = {
  floorId?: string;
  roomTypeId?: string;
  statusId?: string;
  showInactive?: boolean;
};

export function useRooms() {
  return useTableQuery<Room, RoomFilters>({
    queryKey: ["rooms"],
    fetcher: ({ page, limit, filters }) =>
      roomService.findAll({ page, limit, ...filters }),
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { roomService } from "@/common/services/roomService";

export function useRoom(id: string | undefined) {
  return useQuery({
    queryKey: ["rooms", id],
    queryFn: () => roomService.findById(id!),
    enabled: !!id,
  });
}

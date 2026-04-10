"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roomTypePricingService } from "@/common/services/roomTypePricingService";
import type { RoomTypePricing } from "@/types/master.types";

type UpsertPayload = {
  nightlyPrice?: number | null;
  dailyPrice?: number | null;
  hourlyBlockHours?: number | null;
  hourlyBlockPrice?: number | null;
  hourlyExtraPrice?: number | null;
};

export function useRoomTypePricing() {
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["room-type-pricing"],
    queryFn: () => roomTypePricingService.findAll().then(r => r.data ?? []),
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: ({ roomTypeId, data }: { roomTypeId: string; data: UpsertPayload }) =>
      roomTypePricingService.upsert(roomTypeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-type-pricing"] });
      queryClient.invalidateQueries({ queryKey: ["room-map"] });
    },
  });

  return {
    records: records as (RoomTypePricing & { roomType: { id: string; code: string; name: string } })[],
    isLoading,
    upsert: (roomTypeId: string, data: UpsertPayload) => mutation.mutateAsync({ roomTypeId, data }),
    isUpserting: mutation.isPending,
  };
}

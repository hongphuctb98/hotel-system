"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/common/services/apiClient";

export type HousekeepingTask = {
  id: string;
  roomId: string;
  type: string;
  status: string;
  assignedTo?: string | null;
  note?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  room?: { number: string; floor?: { name: string } };
};

export function useHousekeeping(status?: string) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["housekeeping", status],
    queryFn: () =>
      apiClient.get<HousekeepingTask[]>(
        `/api/housekeeping${status ? `?status=${status}` : ""}`
      ),
    refetchInterval: 1000 * 60,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch(`/api/housekeeping/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping"] });
      queryClient.invalidateQueries({ queryKey: ["room-map"] });
    },
  });

  return {
    tasks: data?.data ?? [],
    isLoading,
    updateStatus,
  };
}

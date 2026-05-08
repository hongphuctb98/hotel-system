"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ratePlanService, type RatePlanListParams } from "@/common/services/ratePlanService";

export function useRatePlans(params: RatePlanListParams = {}) {
  return useQuery({
    queryKey: ["rate-plans", params],
    queryFn: () => ratePlanService.list(params),
  });
}

export function useRatePlan(id: string) {
  return useQuery({
    queryKey: ["rate-plans", id],
    queryFn: () => ratePlanService.get(id),
    enabled: !!id,
  });
}

export function useCreateRatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => ratePlanService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate-plans"] });
    },
  });
}

export function useUpdateRatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      ratePlanService.update(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["rate-plans"] });
      queryClient.invalidateQueries({ queryKey: ["rate-plans", id] });
    },
  });
}

export function useDeleteRatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ratePlanService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate-plans"] });
    },
  });
}

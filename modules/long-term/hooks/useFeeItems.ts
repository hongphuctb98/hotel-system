"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { feeItemService, type FeeItemListParams } from "@/common/services/feeItemService";

export function useFeeItems(params: FeeItemListParams = {}) {
  return useQuery({
    queryKey: ["fee-items", params],
    queryFn: () => feeItemService.list(params),
  });
}

export function useCreateFeeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => feeItemService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-items"] });
    },
  });
}

export function useUpdateFeeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      feeItemService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-items"] });
    },
  });
}

export function useDeleteFeeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feeItemService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-items"] });
    },
  });
}

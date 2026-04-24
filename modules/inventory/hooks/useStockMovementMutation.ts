"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "@/common/services/inventoryService";
import { ApiError } from "@/common/services/apiClient";

export function useStockMovementMutation(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { type: string; quantity: number; reason: string; note?: string }) =>
      inventoryService.createMovement(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["movements", productId] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "INSUFFICIENT_STOCK") {
        return;
      }
    },
  });
}

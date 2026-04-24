"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "@/common/services/inventoryService";

export function useReorderLevelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, reorderLevel }: { productId: string; reorderLevel: number }) =>
      inventoryService.updateReorderLevel(productId, reorderLevel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { inventoryService, type MovementFilters } from "@/common/services/inventoryService";

export function useProductMovements(productId: string | null, filters?: MovementFilters) {
  return useQuery({
    queryKey: ["movements", productId, filters],
    queryFn: () => inventoryService.getProductMovements(productId!, filters),
    enabled: !!productId,
    staleTime: 30_000,
  });
}

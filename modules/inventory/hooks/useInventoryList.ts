"use client";

import { useQuery } from "@tanstack/react-query";
import { inventoryService, type InventoryFilters } from "@/common/services/inventoryService";

export function useInventoryList(filters?: InventoryFilters) {
  return useQuery({
    queryKey: ["inventory", filters],
    queryFn: () => inventoryService.getInventoryList(filters),
    staleTime: 30_000,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { masterDataService } from "@/common/services/masterDataService";

export function useExpenseItems() {
  return useQuery({
    queryKey: ["expenseItems", { isActive: true }],
    queryFn: () => masterDataService.expenseItems({ isActive: true }),
    staleTime: Infinity,
  });
}

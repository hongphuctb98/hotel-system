"use client";

import { useQuery } from "@tanstack/react-query";
import { masterDataService } from "@/common/services/masterDataService";

export function useRecurringExpenseItems() {
  return useQuery({
    queryKey: ["expenseItems", { isRecurring: true }],
    queryFn: () => masterDataService.expenseItems({ isRecurring: true, isActive: true }),
    staleTime: Infinity,
  });
}

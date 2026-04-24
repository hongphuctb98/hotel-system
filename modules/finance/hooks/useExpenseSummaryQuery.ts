"use client";

import { useQuery } from "@tanstack/react-query";
import { expenseDocumentService } from "@/common/services/expenseDocumentService";

export function useExpenseSummaryQuery(startMonth: string, endMonth: string) {
  return useQuery({
    queryKey: ["expenseSummary", startMonth, endMonth],
    queryFn: () => expenseDocumentService.getExpenseSummary(startMonth, endMonth),
    enabled: !!startMonth && !!endMonth,
  });
}

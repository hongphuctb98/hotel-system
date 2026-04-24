"use client";

import { useQuery } from "@tanstack/react-query";
import { expenseDocumentService } from "@/common/services/expenseDocumentService";
import type { ExpenseDocumentFilters } from "@/common/services/expenseDocumentService";

export function useExpenseDocuments(filters: ExpenseDocumentFilters = {}) {
  return useQuery({
    queryKey: ["expenseDocuments", filters],
    queryFn: () => expenseDocumentService.getExpenseDocuments(filters),
  });
}

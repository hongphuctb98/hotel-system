"use client";

import { useQuery } from "@tanstack/react-query";
import { expenseDocumentService } from "@/common/services/expenseDocumentService";

export function useExpenseDocument(id: string | null) {
  return useQuery({
    queryKey: ["expenseDocument", id],
    queryFn: () => expenseDocumentService.getExpenseDocument(id!),
    enabled: !!id,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { expenseDocumentService } from "@/common/services/expenseDocumentService";

export function useVendorSuggestions() {
  return useQuery({
    queryKey: ["expenseVendors"],
    queryFn: () => expenseDocumentService.getVendorSuggestions(),
    staleTime: 5 * 60 * 1000,
  });
}

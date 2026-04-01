"use client";

import { apiClient } from "@/common/services/apiClient";
import { useTableQuery } from "@/common/hooks/useTableQuery";
import type { Invoice } from "@/types/booking.types";

export function useBilling() {
  return useTableQuery<Invoice, Record<string, unknown>>({
    queryKey: ["invoices"],
    fetcher: ({ page, limit, filters }) => {
      const query = new URLSearchParams({ page: String(page), limit: String(limit), ...filters as Record<string, string> });
      return apiClient.get<Invoice[]>(`/api/invoices?${query.toString()}`);
    },
  });
}

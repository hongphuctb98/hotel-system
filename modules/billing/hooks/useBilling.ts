"use client";

import { apiClient } from "@/common/services/apiClient";
import { useTableQuery } from "@/common/hooks/useTableQuery";
import type { Invoice } from "@/types/booking.types";

export type BillingFilters = {
  search?: string;
  isPaid?: string;       // "true" | "false"
  issuedFrom?: string;   // ISO date string YYYY-MM-DD
  issuedTo?: string;     // ISO date string YYYY-MM-DD
  roomNumber?: string;
};

export function useBilling(externalFilters?: BillingFilters) {
  return useTableQuery<Invoice, BillingFilters>({
    queryKey: ["invoices"],
    fetcher: ({ page, limit, filters }) => {
      const query = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filters.search)      query.set("search",      filters.search);
      if (filters.isPaid)      query.set("isPaid",      filters.isPaid);
      if (filters.issuedFrom)  query.set("issuedFrom",  filters.issuedFrom);
      if (filters.issuedTo)    query.set("issuedTo",    filters.issuedTo);
      if (filters.roomNumber)  query.set("roomNumber",  filters.roomNumber);
      return apiClient.get<Invoice[]>(`/api/invoices?${query.toString()}`);
    },
    externalFilters,
  });
}

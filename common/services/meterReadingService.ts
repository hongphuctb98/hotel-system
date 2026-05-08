import { apiClient } from "./apiClient";
import type { ApiResponse } from "@/types/api.types";

export interface MeterReadingListParams {
  page?: number;
  limit?: number;
  leaseId?: string;
  feeItemId?: string;
  readingMonth?: string;
}

export interface MeterReadingSummaryParams {
  page?: number;
  limit?: number;
  leaseId?: string;
  readingMonth?: string;
}

export const meterReadingService = {
  list: (params: MeterReadingListParams = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", String(params.page));
    if (params.limit) sp.set("limit", String(params.limit));
    if (params.leaseId) sp.set("leaseId", params.leaseId);
    if (params.feeItemId) sp.set("feeItemId", params.feeItemId);
    if (params.readingMonth) sp.set("readingMonth", params.readingMonth);
    return apiClient.get(`/api/long-term/meter-readings?${sp}`);
  },

  summary: (params: MeterReadingSummaryParams = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", String(params.page));
    if (params.limit) sp.set("limit", String(params.limit));
    if (params.leaseId) sp.set("leaseId", params.leaseId);
    if (params.readingMonth) sp.set("readingMonth", params.readingMonth);
    return apiClient.get(`/api/long-term/meter-readings/summary?${sp}`);
  },

  create: (data: Record<string, unknown>) => apiClient.post("/api/long-term/meter-readings", data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/api/long-term/meter-readings/${id}`, data),
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MeterReadingListResponse = ApiResponse<any>;

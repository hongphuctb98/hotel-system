import { apiClient } from "./apiClient";
import type { ApiResponse } from "@/types/api.types";

export interface RatePlanListParams {
  page?: number;
  limit?: number;
  showInactive?: boolean;
}

export const ratePlanService = {
  list: (params: RatePlanListParams = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", String(params.page));
    if (params.limit) sp.set("limit", String(params.limit));
    if (params.showInactive) sp.set("showInactive", "true");
    return apiClient.get(`/api/long-term/rate-plans?${sp}`);
  },

  get: (id: string) => apiClient.get(`/api/long-term/rate-plans/${id}`),

  create: (data: Record<string, unknown>) => apiClient.post("/api/long-term/rate-plans", data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/api/long-term/rate-plans/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/long-term/rate-plans/${id}`),
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RatePlanListResponse = ApiResponse<any>;

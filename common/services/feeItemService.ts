import { apiClient } from "./apiClient";
import type { ApiResponse } from "@/types/api.types";

export interface FeeItemListParams {
  page?: number;
  limit?: number;
  showInactive?: boolean;
  type?: "METERED" | "FIXED";
}

export const feeItemService = {
  list: (params: FeeItemListParams = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", String(params.page));
    if (params.limit) sp.set("limit", String(params.limit));
    if (params.showInactive) sp.set("showInactive", "true");
    if (params.type) sp.set("type", params.type);
    return apiClient.get(`/api/long-term/fee-items?${sp}`);
  },

  create: (data: Record<string, unknown>) => apiClient.post("/api/long-term/fee-items", data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/api/long-term/fee-items/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/long-term/fee-items/${id}`),
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FeeItemListResponse = ApiResponse<any>;

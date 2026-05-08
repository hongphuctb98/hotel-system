import { apiClient } from "./apiClient";
import type { ApiResponse } from "@/types/api.types";

export interface LeaseListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  roomId?: string;
  guestId?: string;
}

export const leaseService = {
  list: (params: LeaseListParams = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", String(params.page));
    if (params.limit) sp.set("limit", String(params.limit));
    if (params.search) sp.set("search", params.search);
    if (params.status) sp.set("status", params.status);
    if (params.roomId) sp.set("roomId", params.roomId);
    if (params.guestId) sp.set("guestId", params.guestId);
    return apiClient.get(`/api/leases?${sp}`);
  },

  get: (id: string) => apiClient.get(`/api/leases/${id}`),

  create: (data: Record<string, unknown>) => apiClient.post("/api/leases", data),

  update: (id: string, data: Record<string, unknown>) => apiClient.put(`/api/leases/${id}`, data),

  activate: (id: string) => apiClient.patch(`/api/leases/${id}/activate`, {}),

  terminate: (id: string, data: { terminationDate: string; terminationReason?: string }) =>
    apiClient.patch(`/api/leases/${id}/terminate`, data),

  uploadDocument: (leaseId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.upload(`/api/leases/${leaseId}/documents`, formData);
  },

  deleteDocument: (leaseId: string, docId: string) =>
    apiClient.delete(`/api/leases/${leaseId}/documents/${docId}`),
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LeaseListResponse = ApiResponse<any>;

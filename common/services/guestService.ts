import { apiClient } from "./apiClient";
import type { Guest } from "@/types/guest.types";
import type { ApiResponse, PaginationParams } from "@/types/api.types";

export const guestService = {
  findAll: (params?: PaginationParams): Promise<ApiResponse<Guest[]>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) query.set(k, String(v));
      });
    }
    return apiClient.get<Guest[]>(`/api/guests?${query.toString()}`);
  },
  findById: (id: string): Promise<ApiResponse<Guest>> =>
    apiClient.get<Guest>(`/api/guests/${id}`),
  create: (data: Partial<Guest>): Promise<ApiResponse<Guest>> =>
    apiClient.post<Guest>("/api/guests", data),
  update: (id: string, data: Partial<Guest>): Promise<ApiResponse<Guest>> =>
    apiClient.put<Guest>(`/api/guests/${id}`, data),
};

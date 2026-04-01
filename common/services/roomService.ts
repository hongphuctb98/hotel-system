import { apiClient } from "./apiClient";
import type { Room } from "@/types/room.types";
import type { ApiResponse, PaginationParams } from "@/types/api.types";

export const roomService = {
  findAll: (params?: PaginationParams & { floorId?: string; roomTypeId?: string; statusId?: string }): Promise<ApiResponse<Room[]>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) query.set(k, String(v));
      });
    }
    return apiClient.get<Room[]>(`/api/rooms?${query.toString()}`);
  },
  findById: (id: string): Promise<ApiResponse<Room>> =>
    apiClient.get<Room>(`/api/rooms/${id}`),
  create: (data: Partial<Room>): Promise<ApiResponse<Room>> =>
    apiClient.post<Room>("/api/rooms", data),
  update: (id: string, data: Partial<Room>): Promise<ApiResponse<Room>> =>
    apiClient.put<Room>(`/api/rooms/${id}`, data),
  delete: (id: string): Promise<ApiResponse<{ id: string }>> =>
    apiClient.delete<{ id: string }>(`/api/rooms/${id}`),
};

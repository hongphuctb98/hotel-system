import { apiClient } from "./apiClient";
import type {
  StaffMember,
  StaffDocument,
  CreateStaffPayload,
  UpdateStaffPayload,
  CreateAccountPayload,
} from "@/types/staff.types";
import type { ApiResponse, PaginationParams } from "@/types/api.types";

export const staffService = {
  findAll: (
    params?: PaginationParams & { role?: string; showInactive?: boolean }
  ): Promise<ApiResponse<StaffMember[]>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) query.set(k, String(v));
      });
    }
    return apiClient.get<StaffMember[]>(`/api/staff?${query.toString()}`);
  },

  findById: (id: string): Promise<ApiResponse<StaffMember>> =>
    apiClient.get<StaffMember>(`/api/staff/${id}`),

  create: (data: CreateStaffPayload): Promise<ApiResponse<StaffMember>> =>
    apiClient.post<StaffMember>("/api/staff", data),

  update: (id: string, data: UpdateStaffPayload): Promise<ApiResponse<StaffMember>> =>
    apiClient.put<StaffMember>(`/api/staff/${id}`, data),

  delete: (id: string): Promise<ApiResponse<{ id: string }>> =>
    apiClient.delete<{ id: string }>(`/api/staff/${id}`),

  // Provision a login account for an existing Staff member who has none
  createAccount: (
    id: string,
    data: CreateAccountPayload
  ): Promise<ApiResponse<StaffMember>> =>
    apiClient.post<StaffMember>(`/api/staff/${id}/account`, data),

  resetPassword: (
    id: string,
    newPassword: string
  ): Promise<ApiResponse<{ success: boolean }>> =>
    apiClient.post<{ success: boolean }>(`/api/staff/${id}/reset-password`, { newPassword }),

  uploadAvatar: (
    id: string,
    file: File
  ): Promise<ApiResponse<{ id: string; avatarUrl: string }>> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.upload<{ id: string; avatarUrl: string }>(
      `/api/staff/${id}/avatar`,
      formData
    );
  },

  deleteAvatar: (id: string): Promise<ApiResponse<{ id: string }>> =>
    apiClient.delete<{ id: string }>(`/api/staff/${id}/avatar`),

  uploadDocument: (
    id: string,
    file: File,
    type?: string
  ): Promise<ApiResponse<StaffDocument>> => {
    const formData = new FormData();
    formData.append("file", file);
    if (type) formData.append("type", type);
    return apiClient.upload<StaffDocument>(`/api/staff/${id}/documents`, formData);
  },

  deleteDocument: (
    id: string,
    docId: string
  ): Promise<ApiResponse<{ id: string }>> =>
    apiClient.delete<{ id: string }>(`/api/staff/${id}/documents/${docId}`),
};

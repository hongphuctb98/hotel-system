import { apiClient } from "./apiClient";
import type { ApiResponse, PaginationParams } from "@/types/api.types";

export interface AuditLogRecord {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  roomId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; email: string; role: string } | null;
}

export const auditLogService = {
  findAll: (
    params?: PaginationParams & {
      entityType?: string;
      entityId?: string;
      roomId?: string;
      action?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    }
  ): Promise<ApiResponse<AuditLogRecord[]>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) query.set(k, String(v));
      });
    }
    return apiClient.get<AuditLogRecord[]>(`/api/audit-log?${query.toString()}`);
  },
};

import { apiClient } from "./apiClient";

export const tenantBillService = {
  list: (params: { page?: number; limit?: number; leaseId?: string; billingMonth?: string; status?: string } = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", String(params.page));
    if (params.limit) sp.set("limit", String(params.limit));
    if (params.leaseId) sp.set("leaseId", params.leaseId);
    if (params.billingMonth) sp.set("billingMonth", params.billingMonth);
    if (params.status) sp.set("status", params.status);
    return apiClient.get(`/api/tenant-bills?${sp}`);
  },

  get: (id: string) => apiClient.get(`/api/tenant-bills/${id}`),

  generate: (data: { month?: number; year?: number }) => apiClient.post("/api/tenant-bills/generate", data),

  update: (id: string, data: Record<string, unknown>) => apiClient.put(`/api/tenant-bills/${id}`, data),

  approve: (id: string) => apiClient.patch(`/api/tenant-bills/${id}/approve`, {}),

  getPayments: (billId: string, params: { page?: number; limit?: number } = {}) => {
    const sp = new URLSearchParams();
    if (params.page) sp.set("page", String(params.page));
    if (params.limit) sp.set("limit", String(params.limit));
    return apiClient.get(`/api/tenant-bills/${billId}/payments?${sp}`);
  },

  addPayment: (billId: string, data: Record<string, unknown>) =>
    apiClient.post(`/api/tenant-bills/${billId}/payments`, data),

  sendEmail: (id: string) => apiClient.patch(`/api/tenant-bills/${id}/send-email`, {}),

  uploadDocument: (billId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.upload(`/api/tenant-bills/${billId}/documents`, formData);
  },

  deleteDocument: (billId: string, docId: string) =>
    apiClient.delete(`/api/tenant-bills/${billId}/documents/${docId}`),
} as const;

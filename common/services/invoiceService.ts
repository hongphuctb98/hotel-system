import { apiClient } from "./apiClient";
import type { Invoice, Payment } from "@/types/booking.types";
import type { ApiResponse } from "@/types/api.types";

export type PayInvoicePayload = {
  paymentMethodId: string;
  amount: number;
  reference?: string;
};

export const invoiceService = {
  findAll: (params?: Record<string, unknown>): Promise<ApiResponse<Invoice[]>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) query.set(k, String(v));
      });
    }
    return apiClient.get<Invoice[]>(`/api/invoices?${query.toString()}`);
  },
  findById: (id: string): Promise<ApiResponse<Invoice>> =>
    apiClient.get<Invoice>(`/api/invoices/${id}`),
  pay: (
    id: string,
    data: PayInvoicePayload
  ): Promise<ApiResponse<{ payment: Payment; invoice: Invoice }>> =>
    apiClient.post<{ payment: Payment; invoice: Invoice }>(`/api/invoices/${id}`, {
      action: "pay",
      ...data,
    }),
};

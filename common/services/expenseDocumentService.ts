import { apiClient } from "./apiClient";
import type { ApiResponse } from "@/types/api.types";

export type ExpenseDocumentType = "SERVICE" | "INVENTORY" | "INVENTORY_ADJUSTMENT";

export type ExpenseDocumentListItem = {
  id: string;
  type: ExpenseDocumentType;
  documentDate: string;
  accountingMonth: string;
  vendorName: string | null;
  totalAmount: number;
  isPaid: boolean;
  lineCount: number;
  itemNames: string[];
  paymentMethod: { id: string; name: string } | null;
};

export type ServiceLine = {
  id?: string;
  expenseItemId: string;
  expenseItem?: { id: string; name: string; category: { id: string; name: string } };
  amount: number;
};

export type InventoryLine = {
  id?: string;
  productId: string;
  product?: { id: string; name: string; unit: string; category: { id: string; name: string } | null };
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type ExpenseDocumentAttachment = {
  id: string;
  url: string;
  name: string;
};

export type ExpenseDocument = {
  id: string;
  type: ExpenseDocumentType;
  documentDate: string;
  accountingMonth: string;
  vendorName: string | null;
  paymentMethodId: string | null;
  paymentMethod: { id: string; name: string } | null;
  referenceNumber: string | null;
  note: string | null;
  totalAmount: number;
  isPaid: boolean;
  paidAt: string | null;
  isActive: boolean;
  attachments: ExpenseDocumentAttachment[];
  serviceLines: ServiceLine[];
  inventoryLines: InventoryLine[];
};

export type ExpenseDocumentFilters = {
  type?: ExpenseDocumentType;
  accountingMonth?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  vendorName?: string;
  page?: number;
  limit?: number;
};

export type ExpenseSummary = {
  totalService: number;
  totalInventory: number;
  total: number;
  service: {
    categories: Array<{ id: string; name: string; total: number; items: Array<{ id: string; name: string; total: number }> }>;
  };
  inventory: {
    categories: Array<{ id: string; name: string; total: number; products: Array<{ id: string; name: string; unit: string; total: number; totalQuantity: string }> }>;
  };
};

export type CreateExpenseDocumentBody = {
  type: ExpenseDocumentType;
  documentDate: string;
  accountingMonth: string;
  vendorName?: string;
  paymentMethodId?: string;
  referenceNumber?: string;
  note?: string;
  isPaid?: boolean;
  paidAt?: string | null;
  lines: Array<{ expenseItemId?: string; productId?: string; amount?: number; quantity?: number; unitPrice?: number }>;
};

export const expenseDocumentService = {
  getExpenseDocuments: (filters: ExpenseDocumentFilters = {}): Promise<ApiResponse<ExpenseDocumentListItem[]>> => {
    const search = new URLSearchParams();
    if (filters.type) search.set("type", filters.type);
    if (filters.accountingMonth) search.set("accountingMonth", filters.accountingMonth);
    if (filters.startDate) search.set("startDate", filters.startDate);
    if (filters.endDate) search.set("endDate", filters.endDate);
    if (filters.categoryId) search.set("categoryId", filters.categoryId);
    if (filters.vendorName) search.set("vendorName", filters.vendorName);
    if (filters.page) search.set("page", String(filters.page));
    if (filters.limit) search.set("limit", String(filters.limit));
    const qs = search.toString() ? `?${search}` : "";
    return apiClient.get<ExpenseDocumentListItem[]>(`/api/expense-documents${qs}`);
  },

  getExpenseDocument: (id: string): Promise<ApiResponse<ExpenseDocument>> =>
    apiClient.get<ExpenseDocument>(`/api/expense-documents/${id}`),

  createExpenseDocument: (body: CreateExpenseDocumentBody): Promise<ApiResponse<ExpenseDocument>> =>
    apiClient.post<ExpenseDocument>("/api/expense-documents", body),

  updateExpenseDocument: (id: string, body: Partial<CreateExpenseDocumentBody>): Promise<ApiResponse<ExpenseDocument>> =>
    apiClient.put<ExpenseDocument>(`/api/expense-documents/${id}`, body),

  deleteExpenseDocument: (id: string): Promise<ApiResponse<{ id: string }>> =>
    apiClient.delete<{ id: string }>(`/api/expense-documents/${id}`),

  getExpenseSummary: (startMonth: string, endMonth: string): Promise<ApiResponse<ExpenseSummary>> =>
    apiClient.get<ExpenseSummary>(`/api/expense-documents/summary?startMonth=${startMonth}&endMonth=${endMonth}`),

  getVendorSuggestions: (): Promise<ApiResponse<string[]>> =>
    apiClient.get<string[]>("/api/expense-documents/vendors"),

  getRecordedItemIds: (accountingMonth: string): Promise<ApiResponse<string[]>> =>
    apiClient.get<string[]>(`/api/expense-documents/recorded-items?accountingMonth=${accountingMonth}`),

  uploadAttachment: (id: string, file: File): Promise<ApiResponse<ExpenseDocumentAttachment>> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.upload<ExpenseDocumentAttachment>(`/api/expense-documents/${id}/attachments`, formData);
  },

  deleteAttachment: (id: string, attachmentId: string): Promise<ApiResponse<{ id: string }>> =>
    apiClient.delete<{ id: string }>(`/api/expense-documents/${id}/attachments/${attachmentId}`),
};

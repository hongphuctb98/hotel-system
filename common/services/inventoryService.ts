import { apiClient } from "./apiClient";
import type { ApiResponse } from "@/types/api.types";

export type InventoryItem = {
  id: string;
  productId: string;
  quantity: number;
  reorderLevel: number;
  lastStocktakeAt: string | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    unit: string;
    category: { id: string; name: string } | null;
  };
};

export type StockMovement = {
  id: string;
  productId: string;
  type: "IN" | "OUT" | "ADJUST";
  quantity: number;
  reason: "PURCHASE" | "BOOKING_SERVICE" | "HOUSEKEEPING" | "MANUAL" | "STOCKTAKE";
  refType: string | null;
  refId: string | null;
  note: string | null;
  occurredAt: string;
  createdBy: {
    id: string;
    staff: { name: string } | null;
  };
};

export type InventoryFilters = {
  categoryId?: string;
  lowStock?: boolean;
  search?: string;
};

export type MovementFilters = {
  type?: string;
  reason?: string;
  page?: number;
  pageSize?: number;
};

export const inventoryService = {
  getInventoryList: (filters?: InventoryFilters): Promise<ApiResponse<InventoryItem[]>> => {
    const search = new URLSearchParams();
    if (filters?.categoryId) search.set("categoryId", filters.categoryId);
    if (filters?.lowStock) search.set("lowStock", "true");
    if (filters?.search) search.set("search", filters.search);
    const qs = search.toString() ? `?${search}` : "";
    return apiClient.get<InventoryItem[]>(`/api/inventory${qs}`);
  },

  getProductMovements: (productId: string, filters?: MovementFilters): Promise<ApiResponse<StockMovement[]>> => {
    const search = new URLSearchParams();
    if (filters?.type) search.set("type", filters.type);
    if (filters?.reason) search.set("reason", filters.reason);
    if (filters?.page) search.set("page", String(filters.page));
    if (filters?.pageSize) search.set("pageSize", String(filters.pageSize));
    const qs = search.toString() ? `?${search}` : "";
    return apiClient.get<StockMovement[]>(`/api/inventory/${productId}/movements${qs}`);
  },

  createMovement: (
    productId: string,
    data: { type: string; quantity: number; reason: string; note?: string; refType?: string; refId?: string }
  ): Promise<ApiResponse<StockMovement>> =>
    apiClient.post<StockMovement>(`/api/inventory/${productId}/movements`, data),

  updateReorderLevel: (productId: string, reorderLevel: number): Promise<ApiResponse<{ reorderLevel: number }>> =>
    apiClient.patch<{ reorderLevel: number }>(`/api/inventory/${productId}/reorder-level`, { reorderLevel }),
};

import { apiClient } from "./apiClient";
import type {
  Floor,
  RoomType,
  RoomStatus,
  BookingStatus,
  PaymentMethod,
  ServiceItem,
  GuestType,
  Amenity,
  ProductCategory,
  Product,
  ExpenseCategory,
  ExpenseItem,
} from "@/types/master.types";
import type { ApiResponse } from "@/types/api.types";

export const masterDataService = {
  floors: (): Promise<ApiResponse<Floor[]>> =>
    apiClient.get<Floor[]>("/api/master/floors"),
  roomTypes: (): Promise<ApiResponse<RoomType[]>> =>
    apiClient.get<RoomType[]>("/api/master/room-types"),
  roomStatuses: (): Promise<ApiResponse<RoomStatus[]>> =>
    apiClient.get<RoomStatus[]>("/api/master/room-statuses"),
  bookingStatuses: (): Promise<ApiResponse<BookingStatus[]>> =>
    apiClient.get<BookingStatus[]>("/api/master/booking-statuses"),
  paymentMethods: (): Promise<ApiResponse<PaymentMethod[]>> =>
    apiClient.get<PaymentMethod[]>("/api/master/payment-methods"),
  serviceItems: (): Promise<ApiResponse<ServiceItem[]>> =>
    apiClient.get<ServiceItem[]>("/api/master/service-items"),
  guestTypes: (): Promise<ApiResponse<GuestType[]>> =>
    apiClient.get<GuestType[]>("/api/master/guest-types"),
  amenities: (): Promise<ApiResponse<Amenity[]>> =>
    apiClient.get<Amenity[]>("/api/master/amenities"),
  productCategories: (params?: { isActive?: boolean }): Promise<ApiResponse<ProductCategory[]>> => {
    const qs = params?.isActive !== undefined ? `?isActive=${params.isActive}` : "";
    return apiClient.get<ProductCategory[]>(`/api/master/product-categories${qs}`);
  },
  products: (params?: { categoryId?: string; isActive?: boolean }): Promise<ApiResponse<Product[]>> => {
    const search = new URLSearchParams();
    if (params?.categoryId) search.set("categoryId", params.categoryId);
    if (params?.isActive !== undefined) search.set("isActive", String(params.isActive));
    const qs = search.toString() ? `?${search}` : "";
    return apiClient.get<Product[]>(`/api/master/products${qs}`);
  },
  expenseCategories: (params?: { isActive?: boolean }): Promise<ApiResponse<ExpenseCategory[]>> => {
    const qs = params?.isActive !== undefined ? `?isActive=${params.isActive}` : "";
    return apiClient.get<ExpenseCategory[]>(`/api/master/expense-categories${qs}`);
  },
  expenseItems: (params?: { categoryId?: string; isActive?: boolean; isRecurring?: boolean }): Promise<ApiResponse<ExpenseItem[]>> => {
    const search = new URLSearchParams();
    if (params?.categoryId) search.set("categoryId", params.categoryId);
    if (params?.isActive !== undefined) search.set("isActive", String(params.isActive));
    if (params?.isRecurring !== undefined) search.set("isRecurring", String(params.isRecurring));
    const qs = search.toString() ? `?${search}` : "";
    return apiClient.get<ExpenseItem[]>(`/api/master/expense-items${qs}`);
  },
};

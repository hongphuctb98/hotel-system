import { apiClient } from "./apiClient";
import type { Booking, BookingService, CreateBookingPayload } from "@/types/booking.types";
import type { ApiResponse, PaginationParams } from "@/types/api.types";

export type AddServicePayload = {
  serviceItemId: string;
  quantity: number;
  unitPrice?: number;
  note?: string;
  serviceDate?: string;
};

export const bookingService = {
  findAll: (params?: PaginationParams & Record<string, unknown>): Promise<ApiResponse<Booking[]>> => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) query.set(k, String(v));
      });
    }
    return apiClient.get<Booking[]>(`/api/bookings?${query.toString()}`);
  },
  findById: (id: string): Promise<ApiResponse<Booking>> =>
    apiClient.get<Booking>(`/api/bookings/${id}`),
  create: (data: CreateBookingPayload): Promise<ApiResponse<Booking>> =>
    apiClient.post<Booking>("/api/bookings", data),
  update: (id: string, data: Partial<Booking>): Promise<ApiResponse<Booking>> =>
    apiClient.put<Booking>(`/api/bookings/${id}`, data),
  checkIn: (id: string): Promise<ApiResponse<Booking>> =>
    apiClient.post<Booking>(`/api/bookings/${id}/checkin`, {}),
  checkOut: (id: string): Promise<ApiResponse<{ booking: Booking; invoice: unknown }>> =>
    apiClient.post<{ booking: Booking; invoice: unknown }>(`/api/bookings/${id}/checkout`, {}),
  getServices: (id: string): Promise<ApiResponse<BookingService[]>> =>
    apiClient.get<BookingService[]>(`/api/bookings/${id}/services`),
  addService: (id: string, data: AddServicePayload): Promise<ApiResponse<BookingService>> =>
    apiClient.post<BookingService>(`/api/bookings/${id}/services`, data),
  removeService: (id: string, serviceId: string): Promise<ApiResponse<{ deleted: boolean }>> =>
    apiClient.delete<{ deleted: boolean }>(`/api/bookings/${id}/services`, { serviceId }),
};

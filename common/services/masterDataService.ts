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
};

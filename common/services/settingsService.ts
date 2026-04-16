import { apiClient } from "./apiClient";

export interface HotelSettings {
  timezone: string;
  hotelName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export interface HotelInfoPayload {
  hotelName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

export const settingsService = {
  getSettings: () => apiClient.get<HotelSettings>("/api/settings"),
  updateSettings: (timezone: string) =>
    apiClient.put<HotelSettings>("/api/settings", { timezone }),
  updateHotelInfo: (payload: HotelInfoPayload) =>
    apiClient.put<HotelSettings>("/api/settings", payload),
};

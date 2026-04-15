import { apiClient } from "./apiClient";

export interface HotelSettings {
  timezone: string;
}

export const settingsService = {
  getSettings: () => apiClient.get<HotelSettings>("/api/settings"),
  updateSettings: (timezone: string) =>
    apiClient.put<HotelSettings>("/api/settings", { timezone }),
};

import { apiClient } from "./apiClient";
import type { ApiResponse } from "@/types/api.types";
import type { RoomTypePricing } from "@/types/master.types";

type RoomTypePricingWithType = RoomTypePricing & {
  roomType: { id: string; code: string; name: string };
};

type UpsertPricingPayload = {
  nightlyPrice?: number | null;
  dailyPrice?: number | null;
  hourlyBlockHours?: number | null;
  hourlyBlockPrice?: number | null;
  hourlyExtraPrice?: number | null;
};

export const roomTypePricingService = {
  findAll(): Promise<ApiResponse<RoomTypePricingWithType[]>> {
    return apiClient.get("/api/master/room-type-pricing");
  },

  upsert(roomTypeId: string, data: UpsertPricingPayload): Promise<ApiResponse<RoomTypePricing>> {
    return apiClient.put(`/api/master/room-type-pricing/${roomTypeId}`, data);
  },
};

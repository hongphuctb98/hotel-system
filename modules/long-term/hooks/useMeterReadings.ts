"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { meterReadingService, type MeterReadingListParams, type MeterReadingSummaryParams } from "@/common/services/meterReadingService";

export function useMeterReadings(params: MeterReadingListParams = {}) {
  return useQuery({
    queryKey: ["meter-readings", params],
    queryFn: () => meterReadingService.list(params),
  });
}

export function useMeterReadingsSummary(params: MeterReadingSummaryParams = {}) {
  return useQuery({
    queryKey: ["meter-readings-summary", params],
    queryFn: () => meterReadingService.summary(params),
  });
}

export function useCreateMeterReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => meterReadingService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meter-readings"] });
      queryClient.invalidateQueries({ queryKey: ["meter-readings-summary"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-bills"] });
    },
  });
}

export function useUpdateMeterReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      meterReadingService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meter-readings"] });
      queryClient.invalidateQueries({ queryKey: ["meter-readings-summary"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-bills"] });
    },
  });
}

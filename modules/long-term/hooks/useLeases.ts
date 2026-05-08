"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leaseService, type LeaseListParams } from "@/common/services/leaseService";

export function useLeases(params: LeaseListParams = {}) {
  return useQuery({
    queryKey: ["leases", params],
    queryFn: () => leaseService.list(params),
  });
}

export function useLease(id: string) {
  return useQuery({
    queryKey: ["leases", id],
    queryFn: () => leaseService.get(id),
    enabled: !!id,
  });
}

export function useCreateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => leaseService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
    },
  });
}

export function useUpdateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      leaseService.update(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["leases", id] });
    },
  });
}

export function useActivateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaseService.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useTerminateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { terminationDate: string; terminationReason?: string } }) =>
      leaseService.terminate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

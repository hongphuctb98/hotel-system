"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantBillService } from "@/common/services/tenantBillService";

export function useTenantBills(params: { leaseId?: string; billingMonth?: string; status?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ["tenant-bills", params],
    queryFn: () => tenantBillService.list(params),
  });
}

export function useTenantBill(id: string) {
  return useQuery({
    queryKey: ["tenant-bills", id],
    queryFn: () => tenantBillService.get(id),
    enabled: !!id,
  });
}

export function useTenantBillPayments(billId: string) {
  return useQuery({
    queryKey: ["tenant-bill-payments", billId],
    queryFn: () => tenantBillService.getPayments(billId),
    enabled: !!billId,
  });
}

export function useGenerateBills() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { month?: number; year?: number }) => tenantBillService.generate(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenant-bills"] }),
  });
}

export function useApproveBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenantBillService.approve(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-bills"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-bills", id] });
    },
  });
}

export function useUpdateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantBillService.update(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-bills"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-bills", id] });
    },
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ billId, data }: { billId: string; data: Record<string, unknown> }) =>
      tenantBillService.addPayment(billId, data),
    onSuccess: (_data, { billId }) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-bills"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-bills", billId] });
      queryClient.invalidateQueries({ queryKey: ["tenant-bill-payments", billId] });
    },
  });
}

export function useSendBillEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenantBillService.sendEmail(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-bills"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-bills", id] });
    },
  });
}

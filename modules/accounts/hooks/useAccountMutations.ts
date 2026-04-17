"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { staffService } from "@/common/services/staffService";
import type { CreateAccountPayload } from "@/types/staff.types";

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateAccountPayload }) =>
      staffService.createAccount(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["staff-unlinked"] });
    },
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: string; isActive?: boolean } }) =>
      staffService.updateAccount(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["staff", variables.id] });
    },
  });
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { staffService } from "@/common/services/staffService";
import type { CreateStaffPayload, UpdateStaffPayload, CreateAccountPayload } from "@/types/staff.types";

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStaffPayload) => staffService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useCreateStaffAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateAccountPayload }) =>
      staffService.createAccount(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["staff", variables.id] });
    },
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateStaffPayload;
      skipInvalidate?: boolean;
    }) =>
      staffService.update(id, data),
    onSuccess: (_data, variables) => {
      if (variables.skipInvalidate) return;
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["staff", variables.id] });
    },
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => staffService.delete(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.removeQueries({ queryKey: ["staff", id] });
    },
  });
}

export function useResetStaffPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      staffService.resetPassword(id, newPassword),
  });
}

export function useUploadStaffAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      file,
    }: {
      id: string;
      file: File;
      skipInvalidate?: boolean;
    }) =>
      staffService.uploadAvatar(id, file),
    onSuccess: (_data, variables) => {
      if (variables.skipInvalidate) return;
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["staff", variables.id] });
    },
  });
}

export function useDeleteStaffAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => staffService.deleteAvatar(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["staff", id] });
    },
  });
}

export function useUploadStaffDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      file,
      type,
    }: {
      id: string;
      file: File;
      type?: string;
      skipInvalidate?: boolean;
    }) =>
      staffService.uploadDocument(id, file, type),
    onSuccess: (_data, variables) => {
      if (variables.skipInvalidate) return;
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["staff", variables.id] });
    },
  });
}

export function useDeleteStaffDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, docId }: { id: string; docId: string }) =>
      staffService.deleteDocument(id, docId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["staff", variables.id] });
    },
  });
}

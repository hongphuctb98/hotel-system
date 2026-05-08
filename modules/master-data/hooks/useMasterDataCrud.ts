"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { App } from "antd";
import { useTranslations } from "next-intl";
import { apiClient, ApiError } from "@/common/services/apiClient";
import { useConfirm } from "@/common/hooks/useConfirm";
import { usePagination } from "@/common/hooks/usePagination";
import { invalidateMasterDataQueries } from "../utils/queryKeys";

export function useMasterDataCrud<T extends { id: string; isActive: boolean }>(
  endpoint: string
) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { confirm } = useConfirm();
  const t = useTranslations();
  const queryKey = ["master-crud", endpoint];

  const [modalState, setModalState] = useState<{
    open: boolean;
    record: T | null;
  }>({ open: false, record: null });

  const { page, limit, setPage } = usePagination();
  const [isActiveFilter, setIsActiveFilter] = useState<"" | "true" | "false">("true");

  const { data, isLoading } = useQuery({
    queryKey: [...queryKey, page, limit, isActiveFilter],
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (isActiveFilter !== "") qs.set("isActive", isActiveFilter);
      return apiClient.get<T[]>(`${endpoint}?${qs}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<T>) => apiClient.post(endpoint, body),
    onSuccess: async () => {
      await invalidateMasterDataQueries(queryClient, endpoint);
      message.success(t("common.saveSuccess"));
    },
    onError: (err) => {
      message.error(err instanceof ApiError ? err.message : t("common.error"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<T> }) =>
      apiClient.put(`${endpoint}/${id}`, body),
    onSuccess: async () => {
      await invalidateMasterDataQueries(queryClient, endpoint);
      message.success(t("common.saveSuccess"));
    },
    onError: (err) => {
      message.error(err instanceof ApiError ? err.message : t("common.error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`${endpoint}/${id}`),
    onSuccess: async () => {
      await invalidateMasterDataQueries(queryClient, endpoint);
      message.success(t("common.deleteSuccess"));
    },
    onError: (err) => {
      message.error(err instanceof ApiError ? err.message : t("common.error"));
    },
  });

  const openCreate = () => setModalState({ open: true, record: null });
  const openEdit = (record: T) => setModalState({ open: true, record });
  const closeModal = () => setModalState({ open: false, record: null });

  const handleToggleActive = (id: string, isActive: boolean) => {
    updateMutation.mutate({ id, body: { isActive } as Partial<T> });
  };

  const handleDelete = (id: string) => {
    confirm({
      danger: true,
      onOk: () => deleteMutation.mutate(id),
    });
  };

  const pagination = {
    current: page,
    pageSize: limit,
    total: data?.meta?.total ?? 0,
    onChange: setPage,
  };

  return {
    data: (data?.data ?? []) as T[],
    isLoading,
    pagination,
    modalState,
    openCreate,
    openEdit,
    closeModal,
    handleToggleActive,
    handleDelete,
    createMutation,
    updateMutation,
    isActiveFilter,
    setIsActiveFilter,
  };
}

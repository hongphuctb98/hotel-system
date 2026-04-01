"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiClient } from "@/common/services/apiClient";
import { useConfirm } from "@/common/hooks/useConfirm";
import { message } from "antd";

export function useMasterDataCrud<T extends { id: string; isActive: boolean }>(
  endpoint: string
) {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const queryKey = ["master-crud", endpoint];

  const [modalState, setModalState] = useState<{
    open: boolean;
    record: T | null;
  }>({ open: false, record: null });

  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: [...queryKey, page],
    queryFn: () =>
      apiClient.get<T[]>(`${endpoint}?page=${page}&limit=${limit}`),
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<T>) => apiClient.post(endpoint, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      message.success("Saved successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<T> }) =>
      apiClient.put(`${endpoint}/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      message.success("Updated successfully");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`${endpoint}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      message.success("Deleted");
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
    showSizeChanger: false,
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
  };
}

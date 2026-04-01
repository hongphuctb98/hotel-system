"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { usePagination } from "./usePagination";
import type { TablePaginationConfig } from "antd";
import type { ApiResponse } from "@/types/api.types";

interface UseTableQueryOptions<T, TFilters> {
  queryKey: string[];
  fetcher: (params: {
    page: number;
    limit: number;
    filters: TFilters;
  }) => Promise<ApiResponse<T[]>>;
  initialFilters?: TFilters;
}

export function useTableQuery<T, TFilters extends object = Record<string, unknown>>({
  queryKey,
  fetcher,
  initialFilters = {} as TFilters,
}: UseTableQueryOptions<T, TFilters>) {
  const { page, limit, setPage } = usePagination();
  const [filters, setFilters] = useState<TFilters>(initialFilters);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [...queryKey, page, limit, filters],
    queryFn: () => fetcher({ page, limit, filters }),
    placeholderData: (prev) => prev,
  });

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: limit,
    total: data?.meta?.total ?? 0,
    showSizeChanger: true,
    onChange: setPage,
  };

  return {
    data: (data?.data ?? []) as T[],
    isLoading: isLoading || isFetching,
    pagination,
    filters,
    setFilters,
    refetch,
  };
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
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
  /** When provided, these filters are used directly (external filter state management). */
  externalFilters?: TFilters;
}

export function useTableQuery<T, TFilters extends object = Record<string, unknown>>({
  queryKey,
  fetcher,
  initialFilters = {} as TFilters,
  externalFilters,
}: UseTableQueryOptions<T, TFilters>) {
  const { page, limit, setPage } = usePagination();
  const [filters, setFilters] = useState<TFilters>(initialFilters);
  const prevFiltersKeyRef = useRef<string | null>(null);

  const activeFilters = externalFilters ?? filters;
  const filtersKey = JSON.stringify(activeFilters);

  useEffect(() => {
    if (prevFiltersKeyRef.current !== null && prevFiltersKeyRef.current !== filtersKey && page !== 1) {
      setPage(1, limit);
    }
    prevFiltersKeyRef.current = filtersKey;
  }, [filtersKey, limit, page, setPage]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [...queryKey, page, limit, activeFilters],
    queryFn: () => fetcher({ page, limit, filters: activeFilters }),
    placeholderData: (prev) => prev,
  });

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: limit,
    total: data?.meta?.total ?? 0,
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

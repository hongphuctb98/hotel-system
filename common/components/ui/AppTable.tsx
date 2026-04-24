"use client";

import { Table } from "antd";
import type { TableProps, TablePaginationConfig } from "antd";
import EmptyState from "./EmptyState";

const DEFAULT_PAGINATION: TablePaginationConfig = {
  pageSize: 20,
  showSizeChanger: true,
  pageSizeOptions: [10, 20, 50, 100],
};

interface AppTableProps<T> extends TableProps<T> {
  loading?: boolean;
  maxHeight?: number;
  stickyHeader?: boolean;
  scrollable?: boolean;
}

export default function AppTable<T extends object>({
  loading,
  locale,
  scroll,
  pagination,
  maxHeight = 560,
  stickyHeader = true,
  scrollable = true,
  ...props
}: AppTableProps<T>) {
  const resolvedPagination =
    pagination === false ? false : { ...DEFAULT_PAGINATION, ...(pagination ?? {}) };

  return (
    <Table
      loading={loading}
      locale={{ emptyText: <EmptyState />, ...locale }}
      sticky={stickyHeader}
      scroll={scrollable ? { x: "max-content", y: maxHeight, ...scroll } : scroll}
      size="middle"
      childrenColumnName="__children"
      pagination={resolvedPagination}
      {...props}
    />
  );
}

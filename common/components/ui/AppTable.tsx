"use client";

import { Table, Grid } from "antd";
import type { TableProps, TablePaginationConfig } from "antd";
import type { ColumnType } from "antd/es/table";
import EmptyState from "./EmptyState";

const { useBreakpoint } = Grid;

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
  responsiveHideColumns?: {
    below: "md" | "lg";
    columns: string[];
  };
}

export default function AppTable<T extends object>({
  loading,
  locale,
  scroll,
  pagination,
  columns,
  maxHeight = 560,
  stickyHeader = true,
  scrollable = true,
  responsiveHideColumns,
  ...props
}: AppTableProps<T>) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const resolvedPagination =
    pagination === false ? false : { ...DEFAULT_PAGINATION, ...(pagination ?? {}) };

  let resolvedColumns = columns;
  if (responsiveHideColumns && columns) {
    const shouldHide =
      responsiveHideColumns.below === "md" ? isMobile : !screens.lg;
    if (shouldHide) {
      const hiddenSet = new Set(responsiveHideColumns.columns);
      resolvedColumns = (columns as ColumnType<T>[]).filter(
        (col) => !col.dataIndex || !hiddenSet.has(col.dataIndex as string),
      );
    }
  }

  return (
    <Table
      loading={loading}
      locale={{ emptyText: <EmptyState />, ...locale }}
      sticky={stickyHeader}
      scroll={scrollable ? { x: "max-content", y: maxHeight, ...scroll } : scroll}
      size={isMobile ? "small" : "middle"}
      childrenColumnName="__children"
      pagination={resolvedPagination}
      columns={resolvedColumns}
      {...props}
    />
  );
}

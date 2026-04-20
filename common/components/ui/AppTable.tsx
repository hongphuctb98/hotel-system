"use client";

import { Table } from "antd";
import type { TableProps } from "antd";
import EmptyState from "./EmptyState";

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
  maxHeight = 560,
  stickyHeader = true,
  scrollable = true,
  ...props
}: AppTableProps<T>) {
  return (
    <Table
      loading={loading}
      locale={{ emptyText: <EmptyState />, ...locale }}
      sticky={stickyHeader}
      scroll={scrollable ? { x: "max-content", y: maxHeight, ...scroll } : scroll}
      size="middle"
      childrenColumnName="__children"
      {...props}
    />
  );
}

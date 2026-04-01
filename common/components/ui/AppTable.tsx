"use client";

import { Table } from "antd";
import type { TableProps } from "antd";
import EmptyState from "./EmptyState";

interface AppTableProps<T> extends TableProps<T> {
  loading?: boolean;
}

export default function AppTable<T extends object>({
  loading,
  locale,
  ...props
}: AppTableProps<T>) {
  return (
    <Table
      loading={loading}
      locale={{ emptyText: <EmptyState />, ...locale }}
      scroll={{ x: "max-content" }}
      size="middle"
      childrenColumnName="__children"
      {...props}
    />
  );
}

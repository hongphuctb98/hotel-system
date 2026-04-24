"use client";

import { Table } from "antd";
import { useTranslations } from "next-intl";
import PriceDisplay from "@/common/components/ui/PriceDisplay";
import type { ExpenseSummary } from "@/common/services/expenseDocumentService";

type ServiceCategory = ExpenseSummary["service"]["categories"][number];
type ServiceItem = ServiceCategory["items"][number];

interface ServiceExpenseBreakdownProps {
  categories: ServiceCategory[];
  totalService: number;
  isLoading: boolean;
}

export default function ServiceExpenseBreakdown({ categories, totalService, isLoading }: ServiceExpenseBreakdownProps) {
  const t = useTranslations("finance");

  const columns = [
    {
      key: "name",
      dataIndex: "name",
      title: t("category"),
    },
    {
      key: "total",
      dataIndex: "total",
      title: t("totalAmount"),
      align: "right" as const,
      render: (v: number) => <PriceDisplay amount={v} isFallback={false} />,
    },
    {
      key: "pct",
      title: t("percentage"),
      align: "right" as const,
      width: 120,
      render: (_: unknown, record: ServiceCategory) =>
        totalService > 0 ? `${((record.total / totalService) * 100).toFixed(1)}%` : "—",
    },
  ];

  const expandedRowRender = (record: ServiceCategory) => {
    const itemColumns = [
      { key: "name", dataIndex: "name", title: t("item") },
      {
        key: "total",
        dataIndex: "total",
        title: t("totalAmount"),
        align: "right" as const,
        render: (v: number) => <PriceDisplay amount={v} isFallback={false} />,
      },
      {
        key: "pct",
        title: t("percentage"),
        align: "right" as const,
        width: 120,
        render: (_: unknown, item: ServiceItem) =>
          record.total > 0 ? `${((item.total / record.total) * 100).toFixed(1)}%` : "—",
      },
    ];
    return (
      <Table
        columns={itemColumns}
        dataSource={record.items}
        rowKey="id"
        pagination={false}
        size="small"
        showHeader={false}
      />
    );
  };

  return (
    <div>
      <h3 className="font-semibold text-base mb-3">{t("serviceBreakdown")}</h3>
      <Table
        columns={columns}
        dataSource={categories}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        expandable={{ expandedRowRender }}
        locale={{ emptyText: t("emptyService") }}
        size="middle"
      />
    </div>
  );
}

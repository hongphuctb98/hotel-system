"use client";

import { Table } from "antd";
import { useTranslations } from "next-intl";
import PriceDisplay from "@/common/components/ui/PriceDisplay";
import type { ExpenseSummary } from "@/common/services/expenseDocumentService";

type InventoryCategory = ExpenseSummary["inventory"]["categories"][number];
type InventoryProduct = InventoryCategory["products"][number];

interface InventoryBreakdownProps {
  categories: InventoryCategory[];
  totalInventory: number;
  isLoading: boolean;
}

export default function InventoryBreakdown({ categories, totalInventory, isLoading }: InventoryBreakdownProps) {
  const t = useTranslations("finance");

  const columns = [
    { key: "name", dataIndex: "name", title: t("category"), width: 90 },
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
      width: 90,
      render: (_: unknown, record: InventoryCategory) =>
        totalInventory !== 0 ? `${((record.total / totalInventory) * 100).toFixed(1)}%` : "—",
    },
  ];

  const expandedRowRender = (record: InventoryCategory) => {
    const productColumns = [
      { key: "name", dataIndex: "name", title: t("product"), width: 120 },
      { key: "unit", dataIndex: "unit", title: t("unit"), width: 20 },
    
      {
        key: "unitPrice",
        title: t("unitPrice"),
        align: "right" as const,
        render: (_: unknown, p: InventoryProduct) => {
          const qty = parseFloat(p.totalQuantity);
          if (!qty) return "—";
          return (
            <span>
              <PriceDisplay amount={Math.round(p.total / qty)} isFallback={false} /> × {parseFloat(p.totalQuantity).toFixed(1)}
            </span>
          );
        },
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
        width: 90,
        render: (_: unknown, p: InventoryProduct) =>
          record.total !== 0 ? `${((p.total / record.total) * 100).toFixed(1)}%` : "—",
      },
    ];
    return (
      <Table
        columns={productColumns}
        dataSource={record.products}
        rowKey="id"
        pagination={false}
        size="small"
        showHeader={false}
      />
    );
  };

  return (
    <div>
      <h3 className="font-semibold text-base mb-3">{t("inventoryBreakdown")}</h3>
      <Table
        columns={columns}
        dataSource={categories}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        expandable={{ expandedRowRender }}
        locale={{ emptyText: t("emptyInventory") }}
        size="middle"
      />
    </div>
  );
}

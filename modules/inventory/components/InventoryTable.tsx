"use client";

import { useState } from "react";
import { Button, Space, Typography } from "antd";
import { useTranslations } from "next-intl";
import AppTable from "@/common/components/ui/AppTable";
import { useInventoryList } from "../hooks/useInventoryList";
import LowStockBadge from "./LowStockBadge";
import ReorderLevelCell from "./ReorderLevelCell";
import StockMovementModal from "./StockMovementModal";
import MovementHistoryDrawer from "./MovementHistoryDrawer";
import type { InventoryItem } from "@/common/services/inventoryService";
import type { InventoryFilters } from "@/common/services/inventoryService";
import dayjs from "dayjs";

interface InventoryTableProps {
  filters: InventoryFilters;
  canManage: boolean;
}

export default function InventoryTable({ filters, canManage }: InventoryTableProps) {
  const t = useTranslations("inventory");
  const { data, isLoading } = useInventoryList(filters);
  const items = data?.data ?? [];

  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  const columns = [
    {
      key: "name",
      title: "Name",
      render: (_: unknown, record: InventoryItem) => record.product.name,
      sorter: (a: InventoryItem, b: InventoryItem) => a.product.name.localeCompare(b.product.name),
    },
    {
      key: "sku",
      title: "SKU",
      render: (_: unknown, record: InventoryItem) => record.product.sku ?? "—",
      sorter: (a: InventoryItem, b: InventoryItem) => {
        const skuA = a.product.sku ?? "";
        const skuB = b.product.sku ?? "";
        return skuA.localeCompare(skuB);
      }
    },
    {
      key: "category",
      title: "Category",
      width: 140,
      sorter: (a: InventoryItem, b: InventoryItem) => {
        const catA = a.product.category?.name ?? "";
        const catB = b.product.category?.name ?? "";
        return catA.localeCompare(catB);
      },
      render: (_: unknown, record: InventoryItem) => record.product.category?.name ?? "—",
    },
    {
      key: "unit",
      title: "Unit",
      width: 80,
      render: (_: unknown, record: InventoryItem) => record.product.unit,
      sorter: (a: InventoryItem, b: InventoryItem) => {
        const unitA = a.product.unit ?? "";
        const unitB = b.product.unit ?? "";
        return unitA.localeCompare(unitB);
      }
    },
    {
      key: "quantity",
      title: t("quantity"),
      dataIndex: "quantity",
      width: 140,
      render: (v: number, record: InventoryItem) => (
        <Space size={6}>
          <span>{v}</span>
          <LowStockBadge quantity={v} reorderLevel={record.reorderLevel} />
        </Space>
      ),
      sorter: (a: InventoryItem, b: InventoryItem) => a.quantity - b.quantity,
    },
    {
      key: "reorderLevel",
      title: t("reorderLevel"),
      width: 160,
      render: (_: unknown, record: InventoryItem) =>
        canManage ? (
          <ReorderLevelCell productId={record.productId} value={record.reorderLevel} />
        ) : (
          <span>{record.reorderLevel}</span>
        ),
      sorter: (a: InventoryItem, b: InventoryItem) => (a.reorderLevel ?? 0) - (b.reorderLevel ?? 0),
    },
    {
      key: "lastStocktake",
      title: t("lastStocktake"),
      width: 160,
      render: (_: unknown, record: InventoryItem) =>
        record.lastStocktakeAt ? dayjs(record.lastStocktakeAt).format("DD/MM/YYYY HH:mm") : (
          <Typography.Text type="secondary">{t("noLastStocktake")}</Typography.Text>
        ),
      sorter: (a: InventoryItem, b: InventoryItem) => {
        const dateA = a.lastStocktakeAt ? new Date(a.lastStocktakeAt).getTime() : 0;
        const dateB = b.lastStocktakeAt ? new Date(b.lastStocktakeAt).getTime() : 0;
        return dateA - dateB;
      }
    },
    {
      key: "actions",
      title: "",
      width: 180,
      fixed: "right" as const,
      render: (_: unknown, record: InventoryItem) => (
        <Space size={4}>
          {canManage && (
            <Button size="small" onClick={() => setMovementItem(record)} color="primary" variant="solid" >
              {t("recordMovement")}
            </Button>
          )}
          <Button size="small" onClick={() => setHistoryItem(record)} color="gold" variant="solid" >
            {t("history")}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <AppTable
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={isLoading}
      />
      <StockMovementModal
        open={!!movementItem}
        item={movementItem}
        onClose={() => setMovementItem(null)}
      />
      <MovementHistoryDrawer
        open={!!historyItem}
        item={historyItem}
        onClose={() => setHistoryItem(null)}
      />
    </>
  );
}

"use client";

import { usePagination } from "@/common/hooks/usePagination";
import { Tag } from "antd";
import { useTranslations } from "next-intl";
import AppDrawer from "@/common/components/ui/AppDrawer";
import AppTable from "@/common/components/ui/AppTable";
import { useProductMovements } from "../hooks/useProductMovements";
import type { InventoryItem } from "@/common/services/inventoryService";
import dayjs from "dayjs";

interface MovementHistoryDrawerProps {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
}

const TYPE_COLOR: Record<string, string> = { IN: "success", OUT: "error", ADJUST: "warning" };

export default function MovementHistoryDrawer({ open, item, onClose }: MovementHistoryDrawerProps) {
  const t = useTranslations("inventory");
  const { page, limit: pageSize, setPage } = usePagination(1, 20);
  const { data, isLoading } = useProductMovements(item?.productId ?? null, { page, pageSize });

  const movements = data?.data ?? [];
  const total = (data?.meta as { total?: number } | undefined)?.total ?? 0;

  const columns = [
    {
      key: "occurredAt",
      title: t("historyDrawer.date"),
      dataIndex: "occurredAt",
      width: 120,
      render: (v: string) => dayjs(v).format("DD/MM/YY HH:mm"),
    },
    {
      key: "type",
      title: t("historyDrawer.type"),
      dataIndex: "type",
      width: 90,
      render: (v: string) => (
        <Tag color={TYPE_COLOR[v]}>{t(`movementTypes.${v as "IN" | "OUT" | "ADJUST"}`)}</Tag>
      ),
    },
    {
      key: "quantity",
      title: t("historyDrawer.quantity"),
      dataIndex: "quantity",
      width: 80,
      render: (v: number) => (
        <span className={v > 0 ? "text-green-600" : "text-red-600"}>
          {v > 0 ? `+${v}` : v}
        </span>
      ),
    },
    {
      key: "reason",
      title: t("historyDrawer.reason"),
      dataIndex: "reason",
      width: 80,  
      render: (v: string) => t(`movementReasons.${v as "PURCHASE" | "BOOKING_SERVICE" | "HOUSEKEEPING" | "MANUAL" | "STOCKTAKE"}`),
    },
    {
      key: "note",
      title: t("historyDrawer.note"),
      dataIndex: "note",
      ellipsis: true,
      render: (v: string | null) => v ?? "—",
    },
    {
      key: "createdBy",
      title: t("historyDrawer.createdBy"),
      width: 120,
      render: (_: unknown, record: { createdBy?: { staff?: { name?: string } | null } | null }) =>
        record.createdBy?.staff?.name ?? "—",
    },
  ];

  return (
    <AppDrawer open={open} onClose={onClose} title={item ? `${t("historyDrawer.title")} — ${item.product.name}` : t("historyDrawer.title")} size={700}>
      <AppTable
        rowKey="id"
        columns={columns}
        dataSource={movements}
        loading={isLoading}
        size="small"
        pagination={{
          current: page,
          total,
          pageSize,
          onChange: setPage,
        }}
        scroll={{ x: 600 }}
      />
    </AppDrawer>
  );
}

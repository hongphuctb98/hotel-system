"use client";

import { Button, Flex, Space, Tag, App } from "antd";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import AppTable from "@/common/components/ui/AppTable";
import PriceDisplay from "@/common/components/ui/PriceDisplay";
import RatePlanFormDrawer from "./RatePlanFormDrawer";
import { useRatePlans, useDeleteRatePlan } from "../hooks/useRatePlans";
import { usePagination } from "@/common/hooks/usePagination";
import { useState } from "react";
import { getLongTermApiErrorMessage } from "@/common/utils/longTermApiErrorMessage";
import { useConfirm } from "@/common/hooks/useConfirm";

export default function RatePlanTable() {
  const t = useTranslations();
  const { message } = App.useApp();
  const { confirm } = useConfirm();
  const { page, limit, setPage } = usePagination(1, 20);
  const [showInactive, setShowInactive] = useState(false);
  const { data, isLoading } = useRatePlans({ page, limit, showInactive });
  const deletePlan = useDeleteRatePlan();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Record<string, unknown> | null>(null);

  const plans = (data?.data as Record<string, unknown>[]) ?? [];
  const total = (data?.meta as { total?: number })?.total ?? 0;

  function handleAdd() {
    setEditPlan(null);
    setDrawerOpen(true);
  }

  function handleEdit(r: Record<string, unknown>) {
    setEditPlan(r);
    setDrawerOpen(true);
  }

  function handleDelete(r: Record<string, unknown>) {
    confirm({
      onOk: async () => {
        try {
          await deletePlan.mutateAsync(r.id as string);
          message.success(t("longTerm.ratePlan.deleteSuccess"));
        } catch (err) {
          message.error(getLongTermApiErrorMessage(err, t));
        }
      },
    });
  }

  const columns = [
    { key: "label", dataIndex: "label", title: t("longTerm.ratePlan.label") },
    {
      key: "effectiveFrom",
      dataIndex: "effectiveFrom",
      title: t("longTerm.ratePlan.effectiveFrom"),
      render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
    },
    {
      key: "items",
      title: t("longTerm.ratePlan.items"),
      render: (_: unknown, r: Record<string, unknown>) => {
        const items = (r.items as Record<string, unknown>[]) ?? [];
        return (
          <Flex gap={4} wrap>
            {items.map((item) => {
              const fi = item.feeItem as Record<string, unknown>;
              return (
                <Tag key={item.id as string}>
                  {fi?.name as string}: <PriceDisplay amount={item.unitPrice as number} isFallback={false} />
                </Tag>
              );
            })}
            {items.length === 0 && "—"}
          </Flex>
        );
      },
    },
    {
      key: "isActive",
      dataIndex: "isActive",
      title: t("common.status"),
      render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? t("common.active") : t("common.inactive")}</Tag>,
    },
    {
      key: "actions",
      title: t("common.actions"),
      width: 120,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Space size="small">
          <Button size="small" onClick={() => handleEdit(r)}>{t("common.edit")}</Button>
          {!!r.isActive && (
            <Button size="small" danger onClick={() => handleDelete(r)}>{t("common.delete")}</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Flex justify="space-between" style={{ marginBottom: 12 }}>
        <Button onClick={() => setShowInactive((v) => !v)}>
          {showInactive ? t("common.active") : t("longTerm.ratePlan.showInactive")}
        </Button>
        <Button type="primary" onClick={handleAdd}>
          {t("longTerm.ratePlan.createAction")}
        </Button>
      </Flex>
      <AppTable
        rowKey="id"
        dataSource={plans}
        columns={columns}
        loading={isLoading}
        pagination={{ current: page, pageSize: limit, total, onChange: setPage }}
      />
      <RatePlanFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editPlan={editPlan}
      />
    </>
  );
}

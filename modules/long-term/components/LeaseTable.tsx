"use client";

import { Button, Tag, Space, App } from "antd";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import AppTable from "@/common/components/ui/AppTable";
import PriceDisplay from "@/common/components/ui/PriceDisplay";
import { useLeases } from "../hooks/useLeases";
import { useActivateLease } from "../hooks/useLeases";
import { usePagination } from "@/common/hooks/usePagination";
import { getLongTermApiErrorMessage } from "@/common/utils/longTermApiErrorMessage";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "orange",
  ACTIVE: "green",
  TERMINATED: "red",
  EXPIRED: "default",
};

interface LeaseTableProps {
  onEdit: (lease: Record<string, unknown>) => void;
  onTerminate: (lease: Record<string, unknown>) => void;
  onViewDetail?: (lease: Record<string, unknown>) => void;
}

export default function LeaseTable({ onEdit, onTerminate }: LeaseTableProps) {
  const t = useTranslations();
  const { message, modal } = App.useApp();
  const { page, limit, setPage } = usePagination(1, 20);
  const { data, isLoading } = useLeases({ page, limit });
  const activate = useActivateLease();

  const leases = (data?.data as Record<string, unknown>[]) ?? [];
  const total = (data?.meta as { total?: number })?.total ?? 0;

  function handleActivate(lease: Record<string, unknown>) {
    modal.confirm({
      title: t("longTerm.lease.activateAction"),
      content: t("longTerm.lease.activateConfirm"),
      onOk: async () => {
        try {
          await activate.mutateAsync(lease.id as string);
          message.success(t("longTerm.lease.activateSuccess"));
        } catch (err) {
          message.error(getLongTermApiErrorMessage(err, t));
        }
      },
    });
  }

  const columns = [
    {
      key: "room",
      title: t("longTerm.lease.room"),
      render: (_: unknown, r: Record<string, unknown>) => {
        const room = r.room as Record<string, unknown>;
        return `${room?.number} · ${(room?.roomType as Record<string, unknown>)?.name ?? ""}`;
      },
    },
    {
      key: "tenant",
      title: t("longTerm.lease.tenant"),
      render: (_: unknown, r: Record<string, unknown>) => {
        const guest = r.guest as Record<string, unknown>;
        return `${guest?.firstName} ${guest?.lastName}`;
      },
    },
    {
      key: "status",
      title: t("longTerm.lease.status"),
      render: (_: unknown, r: Record<string, unknown>) => (
        <Tag color={STATUS_COLORS[r.status as string] ?? "default"}>
          {t(`longTerm.lease.status${r.status as string}`)}
        </Tag>
      ),
    },
    {
      key: "startDate",
      title: t("longTerm.lease.startDate"),
      render: (_: unknown, r: Record<string, unknown>) =>
        dayjs(r.startDate as string).format("DD/MM/YYYY"),
    },
    {
      key: "endDate",
      title: t("longTerm.lease.endDate"),
      render: (_: unknown, r: Record<string, unknown>) =>
        r.endDate ? dayjs(r.endDate as string).format("DD/MM/YYYY") : "—",
    },
    {
      key: "monthlyRent",
      title: t("longTerm.lease.monthlyRent"),
      render: (_: unknown, r: Record<string, unknown>) => (
        <PriceDisplay amount={r.monthlyRent as number} isFallback={false} />
      ),
    },
    {
      key: "actions",
      title: t("common.actions"),
      width: 200,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Space size="small">
          {r.status === "PENDING" && (
            <Button size="small" type="primary" onClick={() => handleActivate(r)}>
              {t("longTerm.lease.activateAction")}
            </Button>
          )}
          {(r.status === "PENDING" || r.status === "ACTIVE") && (
            <Button size="small" onClick={() => onEdit(r)}>
              {t("common.edit")}
            </Button>
          )}
          {r.status === "ACTIVE" && (
            <Button size="small" danger onClick={() => onTerminate(r)}>
              {t("longTerm.lease.terminateAction")}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <AppTable
      rowKey="id"
      dataSource={leases}
      columns={columns}
      loading={isLoading}
      pagination={{ current: page, pageSize: limit, total, onChange: setPage }}
    />
  );
}

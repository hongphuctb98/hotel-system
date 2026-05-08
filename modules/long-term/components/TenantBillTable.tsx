"use client";

import { Button, Tag } from "antd";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import AppTable from "@/common/components/ui/AppTable";
import PriceDisplay from "@/common/components/ui/PriceDisplay";
import { useTenantBills } from "../hooks/useTenantBills";
import { usePagination } from "@/common/hooks/usePagination";

type BillStatusDisplay = "DRAFT" | "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";

const BILL_STATUS_COLORS: Record<BillStatusDisplay, string> = {
  DRAFT: "default",
  PENDING: "orange",
  PARTIAL: "blue",
  PAID: "green",
  OVERDUE: "red",
};

interface TenantBillTableProps {
  onViewDetail: (bill: Record<string, unknown>) => void;
}

export default function TenantBillTable({ onViewDetail }: TenantBillTableProps) {
  const t = useTranslations();
  const { page, limit, setPage } = usePagination(1, 20);
  const { data, isLoading } = useTenantBills({ page, limit });

  const bills = (data?.data as Record<string, unknown>[]) ?? [];
  const total = (data?.meta as { total?: number })?.total ?? 0;

  function getDisplayStatus(bill: Record<string, unknown>): BillStatusDisplay {
    if (bill.isOverdue) return "OVERDUE";
    return bill.status as BillStatusDisplay;
  }

  const columns = [
    {
      key: "billingMonth",
      dataIndex: "billingMonth",
      title: t("longTerm.bill.billingMonth"),
      width: 100,
    },
    {
      key: "tenant",
      title: t("longTerm.lease.tenant"),
      render: (_: unknown, r: Record<string, unknown>) => {
        const lease = r.lease as Record<string, unknown>;
        const guest = lease?.guest as Record<string, unknown>;
        return `${guest?.firstName} ${guest?.lastName}`;
      },
    },
    {
      key: "room",
      title: t("longTerm.lease.room"),
      render: (_: unknown, r: Record<string, unknown>) => {
        const lease = r.lease as Record<string, unknown>;
        const room = lease?.room as Record<string, unknown>;
        return room?.number as string;
      },
    },
    {
      key: "status",
      title: t("common.status"),
      width: 120,
      render: (_: unknown, r: Record<string, unknown>) => {
        const displayStatus = getDisplayStatus(r);
        return (
          <Tag color={BILL_STATUS_COLORS[displayStatus]}>
            {t(`longTerm.bill.status${displayStatus}`)}
          </Tag>
        );
      },
    },
    {
      key: "totalAmount",
      dataIndex: "totalAmount",
      title: t("longTerm.bill.totalAmount"),
      render: (v: number) => <PriceDisplay amount={v} isFallback={false} />,
    },
    {
      key: "totalPaid",
      dataIndex: "totalPaid",
      title: t("longTerm.bill.totalPaid"),
      render: (v: number) => <PriceDisplay amount={v} isFallback={false} />,
    },
    {
      key: "dueDate",
      dataIndex: "dueDate",
      title: t("longTerm.bill.dueDate"),
      render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
    },
    {
      key: "emailSentAt",
      dataIndex: "emailSentAt",
      title: t("longTerm.bill.emailSentAt"),
      render: (v: string | null) => v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—",
    },
    {
      key: "actions",
      title: t("common.actions"),
      width: 80,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Button size="small" onClick={() => onViewDetail(r)}>
          {t("longTerm.bill.detail")}
        </Button>
      ),
    },
  ];

  return (
    <AppTable
      rowKey="id"
      dataSource={bills}
      columns={columns}
      loading={isLoading}
      pagination={{ current: page, pageSize: limit, total, onChange: setPage }}
      responsiveHideColumns={{ below: "lg", columns: ["totalPaid", "dueDate", "emailSentAt"] }}
    />
  );
}

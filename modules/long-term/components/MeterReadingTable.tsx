"use client";

import { Button, Flex, Select, Tag, Typography, App } from "antd";
import { useTranslations } from "next-intl";
import AppTable from "@/common/components/ui/AppTable";
import MeterReadingFormDrawer from "./MeterReadingFormDrawer";
import { useMeterReadingsSummary } from "../hooks/useMeterReadings";
import { useLeases } from "../hooks/useLeases";
import { usePagination } from "@/common/hooks/usePagination";
import { useState } from "react";

const monthOptions = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - i);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return { value: `${y}-${m}`, label: `${m}/${y}` };
});

type SummaryRow = {
  leaseId: string;
  readingMonth: string;
  lease: {
    id: string;
    status: string;
    room: { number: string };
    guest: { firstName: string; lastName: string };
  } | null;
  readings: {
    id: string;
    feeItemId: string;
    feeItem: { name: string; unit: string | null };
    previousReading: number;
    currentReading: number;
    consumption: number;
  }[];
  bill: { id: string; status: string; totalAmount: number; dueDate: string } | null;
};

const LEASE_STATUS_COLOR: Record<string, string> = {
  ACTIVE: "green",
  EXPIRED: "default",
  TERMINATED: "red",
  PENDING: "orange",
};

const BILL_STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  PENDING: "orange",
  PARTIAL: "blue",
  PAID: "green",
  OVERDUE: "red",
};

export default function MeterReadingTable() {
  const t = useTranslations();
  const { message: _msg } = App.useApp();
  const { page, limit, setPage } = usePagination(1, 20);
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(monthOptions[0].value);
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | undefined>(undefined);

  const { data, isLoading } = useMeterReadingsSummary({ page, limit, leaseId: selectedLeaseId, readingMonth: selectedMonth });
  const { data: leaseData } = useLeases({ status: "ACTIVE", limit: 200 });
  const activeLeases = (leaseData?.data as Record<string, unknown>[]) ?? [];

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<SummaryRow | null>(null);

  const rows = (data?.data as SummaryRow[]) ?? [];
  const total = (data?.meta as { total?: number })?.total ?? 0;

  function handleAdd() {
    setEditRow(null);
    setDrawerOpen(true);
  }

  function handleEdit(row: SummaryRow) {
    setEditRow(row);
    setDrawerOpen(true);
  }

  const columns = [
    {
      key: "lease",
      title: t("longTerm.lease.title"),
      render: (_: unknown, r: SummaryRow) => {
        if (!r.lease) return "—";
        return `${r.lease.room.number} · ${r.lease.guest.firstName} ${r.lease.guest.lastName}`;
      },
    },
    {
      key: "readingMonth",
      title: t("longTerm.meterReading.readingMonth"),
      width: 90,
      render: (_: unknown, r: SummaryRow) => {
        const [y, m] = r.readingMonth.split("-");
        return `${m}/${y}`;
      },
    },
    {
      key: "readings",
      title: t("longTerm.meterReading.readings"),
      render: (_: unknown, r: SummaryRow) => (
        <div className="space-y-0.5">
          {r.readings.map((rd) => (
            <div key={rd.id} className="text-sm">
              <span className="font-medium">{rd.feeItem.name}:</span>{" "}
              {rd.previousReading.toFixed(1)} → {rd.currentReading.toFixed(1)}{" "}
              <Typography.Text type="secondary">
                ({rd.consumption.toFixed(1)} {rd.feeItem.unit ?? ""})
              </Typography.Text>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "leaseStatus",
      title: t("longTerm.meterReading.leaseStatus"),
      width: 120,
      render: (_: unknown, r: SummaryRow) => {
        if (!r.lease) return null;
        const status = r.lease.status;
        const color = LEASE_STATUS_COLOR[status] ?? "default";
        const label = t(`longTerm.lease.status${status}` as Parameters<typeof t>[0]);
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      key: "billStatus",
      title: t("longTerm.meterReading.billStatus"),
      width: 140,
      render: (_: unknown, r: SummaryRow) => {
        if (!r.bill) {
          return <Typography.Text type="secondary">{t("longTerm.meterReading.billStatusNone")}</Typography.Text>;
        }
        const status = r.bill.status;
        const color = BILL_STATUS_COLOR[status] ?? "default";
        const label = t(`longTerm.bill.status${status}` as Parameters<typeof t>[0]);
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      key: "actions",
      title: t("common.actions"),
      width: 80,
      render: (_: unknown, r: SummaryRow) => {
        if (r.bill?.status === "PAID") return null;
        return (
          <Button size="small" onClick={() => handleEdit(r)}>
            {t("common.edit")}
          </Button>
        );
      },
    },
  ];

  const leaseOptions = activeLeases.map((l) => {
    const room = l.room as Record<string, unknown>;
    const guest = l.guest as Record<string, unknown>;
    return { value: l.id as string, label: `${room?.number} · ${guest?.firstName} ${guest?.lastName}` };
  });

  const drawerLeases = activeLeases.map((l) => ({
    id: l.id as string,
    room: l.room as { number: string },
    guest: l.guest as { firstName: string; lastName: string },
  }));

  return (
    <>
      <Flex gap={8} style={{ marginBottom: 12 }} wrap>
        <Select
          allowClear
          placeholder={t("longTerm.meterReading.readingMonth")}
          options={monthOptions}
          value={selectedMonth}
          onChange={(v) => { setSelectedMonth(v); setPage(1); }}
          style={{ width: 120 }}
        />
        <Select
          allowClear
          showSearch
          placeholder={t("longTerm.lease.title")}
          options={leaseOptions}
          value={selectedLeaseId}
          onChange={(v) => { setSelectedLeaseId(v); setPage(1); }}
          filterOption={(input, opt) => String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
          style={{ width: 220 }}
        />
        <div className="flex-1" />
        <Button type="primary" onClick={handleAdd}>
          {t("longTerm.meterReading.createAction")}
        </Button>
      </Flex>
      <AppTable
        rowKey={(r: SummaryRow) => `${r.leaseId}::${r.readingMonth}`}
        dataSource={rows}
        columns={columns}
        loading={isLoading}
        pagination={{ current: page, pageSize: limit, total, onChange: setPage }}
      />
      <MeterReadingFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editRow={editRow}
        leases={drawerLeases}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { DatePicker, Input, Select } from "antd";
import type { Dayjs } from "dayjs";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import AppTable from "@/common/components/ui/AppTable";
import StatusBadge from "@/common/components/ui/StatusBadge";
import { useBilling, type BillingFilters } from "@/modules/billing/hooks/useBilling";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";
import type { Invoice } from "@/types/booking.types";

export default function BillingPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { format, formatDate } = useLocaleCurrency();

  const [filters, setFilters] = useState<BillingFilters>({});
  const { data, isLoading, pagination } = useBilling(filters);

  function updateFilter(patch: Partial<BillingFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function handleDateRange(_: [Dayjs | null, Dayjs | null] | null, strs: [string, string] | null) {
    updateFilter({
      issuedFrom: strs?.[0] || undefined,
      issuedTo:   strs?.[1] || undefined,
    });
  }

  const columns = [
    {
      key: "invoiceNumber",
      dataIndex: "invoiceNumber",
      sorter: (a: Invoice, b: Invoice) => a.invoiceNumber.localeCompare(b.invoiceNumber),
      title: t("billing.invoiceNumber"),
      width: 180,
    },
    {
      key: "booking",
      title: t("booking.guest"),
      sorter: (a: Invoice, b: Invoice) => {
        const nameA = a.booking ? `${a.booking.guest.firstName} ${a.booking.guest.lastName}` : "";
        const nameB = b.booking ? `${b.booking.guest.firstName} ${b.booking.guest.lastName}` : "";
        return nameA.localeCompare(nameB);
      },
      render: (_: unknown, r: Invoice) =>
        r.booking
          ? `${r.booking.guest.firstName} ${r.booking.guest.lastName}`
          : "—",
    },
    {
      key: "room",
      title: t("booking.room"),
      sorter: (a: Invoice, b: Invoice) => {
        const roomA = a.booking?.room?.number ?? "";
        const roomB = b.booking?.room?.number ?? "";
        return roomA.localeCompare(roomB);
      },
      render: (_: unknown, r: Invoice) => r.booking?.room?.number ?? "—",
      width: 100,
    },
    {
      key: "issuedAt",
      dataIndex: "issuedAt",
      title: t("billing.issuedAt"),
      sorter: (a: Invoice, b: Invoice) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime(), 
      render: (v: string) => formatDate(v),
      width: 120,
    },
    {
      key: "totalAmount",
      dataIndex: "totalAmount",
      sorter: (a: Invoice, b: Invoice) => a.totalAmount - b.totalAmount,
      title: t("billing.total"),
      render: (v: number) => format(v),
      width: 140,
    },
    {
      key: "isPaid",
      dataIndex: "isPaid",
      sorter: (a: Invoice, b: Invoice) => Number(a.isPaid) - Number(b.isPaid),
      title: t("common.status"),
      render: (v: boolean) => (
        <StatusBadge
          color={v ? "#52c41a" : "#fa8c16"}
          label={v ? t("billing.paid") : t("billing.unpaid")}
        />
      ),
      width: 120,
    },
  ];

  return (
    <div className="space-y-4">
      <AppPageHeader title="billing.title" />

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <Input.Search
          placeholder={`${t("billing.invoiceNumber")} / ${t("booking.guest")}`}
          allowClear
          style={{ width: 260 }}
          value={filters.search ?? ""}
          onChange={(e) => updateFilter({ search: e.target.value || undefined })}
          onSearch={(v) => updateFilter({ search: v || undefined })}
        />
        <Input
          placeholder={t("booking.room")}
          allowClear
          style={{ width: 140 }}
          value={filters.roomNumber ?? ""}
          onChange={(e) => updateFilter({ roomNumber: e.target.value || undefined })}
        />
        <Select
          allowClear
          placeholder={t("common.status")}
          style={{ width: 160 }}
          value={filters.isPaid}
          onChange={(v) => updateFilter({ isPaid: v ?? undefined })}
          options={[
            { value: "true",  label: t("billing.paid") },
            { value: "false", label: t("billing.unpaid") },
          ]}
        />
        <DatePicker.RangePicker
          style={{ width: 240 }}
          onChange={handleDateRange}
          placeholder={[t("billing.issuedAt"), t("billing.issuedAt")]}
          format="YYYY-MM-DD"
        />
      </div>

      <AppTable
        columns={columns}
        dataSource={data}
        loading={isLoading}
        pagination={pagination}
        rowKey="id"
        onRow={(r) => ({
          onClick: () => router.push(`/${locale}/billing/${r.id}`),
          style: { cursor: "pointer" },
        })}
      />
    </div>
  );
}

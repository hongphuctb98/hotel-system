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
      title: t("billing.invoiceNumber"),
      width: 180,
    },
    {
      key: "booking",
      title: t("booking.guest"),
      render: (_: unknown, r: Invoice) =>
        r.booking
          ? `${r.booking.guest.firstName} ${r.booking.guest.lastName}`
          : "—",
    },
    {
      key: "room",
      title: t("booking.room"),
      render: (_: unknown, r: Invoice) => r.booking?.room?.number ?? "—",
      width: 100,
    },
    {
      key: "issuedAt",
      dataIndex: "issuedAt",
      title: t("billing.issuedAt"),
      render: (v: string) => formatDate(v),
      width: 120,
    },
    {
      key: "totalAmount",
      dataIndex: "totalAmount",
      title: t("billing.total"),
      render: (v: number) => format(v),
      width: 140,
    },
    {
      key: "isPaid",
      dataIndex: "isPaid",
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

"use client";

import { useState } from "react";
import { DatePicker, Input, Select, Tag, Typography } from "antd";
import type { Dayjs } from "dayjs";
import { useTranslations, useLocale } from "next-intl";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import AppTable from "@/common/components/ui/AppTable";
import { useTableQuery } from "@/common/hooks/useTableQuery";
import { auditLogService, type AuditLogRecord } from "@/common/services/auditLogService";
import { formatDate } from "@/common/utils/date";

const { Text } = Typography;

const ACTION_COLORS: Record<string, string> = {
  CREATE:    "green",
  CHECK_IN:  "blue",
  CHECK_OUT: "orange",
  CANCEL:    "red",
  PAYMENT:   "purple",
  UPDATE:    "geekblue",
};

const ALL_ACTIONS   = ["CREATE", "CHECK_IN", "CHECK_OUT", "CANCEL", "PAYMENT", "UPDATE"];
const ALL_ENTITY_TYPES = ["BOOKING", "PAYMENT", "ROOM"];

type HistoryFilters = {
  search?:     string;
  action?:     string;
  entityType?: string;
  dateFrom?:   string;
  dateTo?:     string;
};

function renderSummary(record: AuditLogRecord): React.ReactNode {
  const v = record.newValues;
  if (!v) return <Text type="secondary">—</Text>;

  if (record.action === "CREATE" && record.entityType === "BOOKING") {
    return (
      <Text style={{ fontSize: 12 }}>
        {v.bookingNumber ? `#${v.bookingNumber}` : ""}
        {v.checkInDate ? ` · ${formatDate(String(v.checkInDate), "en")}` : ""}
        {v.checkOutDate ? ` → ${formatDate(String(v.checkOutDate), "en")}` : ""}
      </Text>
    );
  }

  if (record.action === "PAYMENT") {
    return (
      <Text style={{ fontSize: 12 }}>
        {v.amount ? `${Number(v.amount).toLocaleString()} VND` : "—"}
      </Text>
    );
  }

  if (record.action === "UPDATE" && record.entityType === "BOOKING") {
    const parts = Object.keys(v).map((field) => {
      const oldVal = record.oldValues?.[field];
      return `${field}: ${oldVal ?? "?"} → ${v[field]}`;
    });
    return <Text style={{ fontSize: 12 }}>{parts.join(" · ") || "—"}</Text>;
  }

  if (record.action === "UPDATE" && record.entityType === "ROOM") {
    const oldId = record.oldValues?.roomStatusId;
    const newId = v.roomStatusId;
    return (
      <Text style={{ fontSize: 12 }}>
        Status: {String(oldId ?? "?")} → {String(newId ?? "?")}
      </Text>
    );
  }

  const pairs = Object.entries(v).slice(0, 3).map(([k, val]) => `${k}: ${val}`).join(" · ");
  return <Text style={{ fontSize: 12 }}>{pairs || "—"}</Text>;
}

export default function HistoryPage() {
  const t      = useTranslations();
  const locale = useLocale() as "en" | "vi";

  const [filters, setFilters] = useState<HistoryFilters>({});

  function updateFilter(patch: Partial<HistoryFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  const { data, isLoading, pagination } = useTableQuery<AuditLogRecord, HistoryFilters>({
    queryKey: ["audit-log", "all", JSON.stringify(filters)],
    fetcher: ({ page, limit }) =>
      auditLogService.findAll({ ...filters, page, limit }),
    externalFilters: filters,
  });

  function handleDateRange(
    _: [Dayjs | null, Dayjs | null] | null,
    strs: [string, string] | string[]
  ) {
    updateFilter({
      dateFrom: strs?.[0] || undefined,
      dateTo:   strs?.[1] || undefined,
    });
  }

  const columns = [
    {
      key:       "createdAt",
      dataIndex: "createdAt",
      title:     t("common.timestamp"),
      width:     160,
      render:    (v: string) => (
        <Text style={{ fontSize: 12, whiteSpace: "nowrap" }}>
          {formatDate(v, locale)}{" "}
          {new Date(v).toLocaleTimeString(locale === "vi" ? "vi-VN" : "en-US", {
            hour: "2-digit", minute: "2-digit",
          })}
        </Text>
      ),
    },
    {
      key:       "action",
      dataIndex: "action",
      title:     t("common.action"),
      width:     120,
      render:    (v: string) => (
        <Tag color={ACTION_COLORS[v] ?? "default"} style={{ fontSize: 11 }}>
          {v.replace("_", " ")}
        </Tag>
      ),
    },
    {
      key:       "entityType",
      dataIndex: "entityType",
      title:     t("common.entityType"),
      width:     110,
      render:    (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      key:       "entityId",
      dataIndex: "entityId",
      title:     "Entity ID",
      width:     200,
      render:    (v: string) => (
        <Text copyable style={{ fontSize: 11, fontFamily: "monospace" }}>
          {v}
        </Text>
      ),
    },
    {
      key:    "summary",
      title:  t("common.summary"),
      render: (_: unknown, row: AuditLogRecord) => renderSummary(row),
    },
    {
      key:    "actor",
      title:  t("common.actor"),
      width:  180,
      render: (_: unknown, row: AuditLogRecord) =>
        row.user ? (
          <Text style={{ fontSize: 12 }}>{row.user.email}</Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>System</Text>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <AppPageHeader title="history.title" />

      <div className="flex flex-wrap gap-2">
        <Input.Search
          placeholder={t("common.search")}
          allowClear
          style={{ width: 240 }}
          value={filters.search ?? ""}
          onChange={(e) => updateFilter({ search: e.target.value || undefined })}
          onSearch={(v) => updateFilter({ search: v || undefined })}
        />
        <Select
          allowClear
          placeholder={t("history.allActions")}
          style={{ width: 160 }}
          value={filters.action}
          onChange={(v) => updateFilter({ action: v ?? undefined })}
          options={ALL_ACTIONS.map((a) => ({
            value: a,
            label: (
              <Tag color={ACTION_COLORS[a] ?? "default"} style={{ fontSize: 11, margin: 0 }}>
                {a.replace("_", " ")}
              </Tag>
            ),
          }))}
        />
        <Select
          allowClear
          placeholder={t("history.allEntityTypes")}
          style={{ width: 160 }}
          value={filters.entityType}
          onChange={(v) => updateFilter({ entityType: v ?? undefined })}
          options={ALL_ENTITY_TYPES.map((e) => ({ value: e, label: e }))}
        />
        <DatePicker.RangePicker
          style={{ width: 260 }}
          onChange={handleDateRange}
          placeholder={[t("history.filterDateFrom"), t("history.filterDateTo")]}
          format="YYYY-MM-DD"
        />
      </div>

      <AppTable
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        columns={columns}
        pagination={pagination}
        locale={{ emptyText: t("history.noHistory") }}
      />
    </div>
  );
}

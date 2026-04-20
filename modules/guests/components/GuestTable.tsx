"use client";

import { Button, Tag, Input } from "antd";
import { IconEye, IconSearch } from "@tabler/icons-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import AppTable from "@/common/components/ui/AppTable";
import StatusBadge from "@/common/components/ui/StatusBadge";
import { textSorter } from "@/common/components/ui/table/sorters";
import { useGuests } from "../hooks/useGuests";
import type { Guest } from "@/types/guest.types";

export default function GuestTable() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { data, isLoading, pagination, filters, setFilters } = useGuests();

  const columns = [
    {
      key: "name",
      title: t("guest.lastName"),
      sorter: textSorter<Guest>((r) => `${r.lastName} ${r.firstName}`),
      render: (_: unknown, r: Guest) => `${r.lastName} ${r.firstName}`,
    },
    {
      key: "phone",
      dataIndex: "phone",
      title: t("guest.phone"),
      sorter: textSorter<Guest>((r) => r.phone ?? ""),
      render: (v: string | null) => v ?? "—",
    },
    {
      key: "idNumber",
      dataIndex: "idNumber",
      title: t("guest.idNumber"),
      sorter: textSorter<Guest>((r) => r.idNumber ?? ""),
      render: (v: string | null) => v ?? "—",
    },
    {
      key: "guestType",
      title: t("guest.guestType"),
      sorter: textSorter<Guest>((r) => r.guestType.name),
      render: (_: unknown, r: Guest) => (
        <StatusBadge color={r.guestType.color} label={r.guestType.name} />
      ),
      width: 120,
    },
    {
      key: "tags",
      dataIndex: "tags",
      title: t("guest.tags"),
      sorter: textSorter<Guest>((r) => (r.tags ?? []).join(", ")),
      render: (tags: string[]) =>
        tags.map((tag) => <Tag key={tag}>{tag}</Tag>),
    },
    {
      key: "actions",
      title: t("common.actions"),
      width: 80,
      fixed: "right" as const,
      render: (_: unknown, r: Guest) => (
        <Button
          type="text"
          size="small"
          icon={<IconEye size={14} />}
          onClick={() => router.push(`/${locale}/guests/${r.id}`)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Input
        prefix={<IconSearch size={16} />}
        placeholder={t("common.search")}
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        style={{ maxWidth: 300 }}
        allowClear
      />
      <AppTable
        columns={columns}
        dataSource={data}
        loading={isLoading}
        pagination={pagination}
        rowKey="id"
        maxHeight={600}
      />
    </div>
  );
}

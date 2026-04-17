"use client";

import { Button, Tag, Typography } from "antd";
import { IconArrowLeft } from "@tabler/icons-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import AppTable from "@/common/components/ui/AppTable";
import { useTableQuery } from "@/common/hooks/useTableQuery";
import { useMasterData } from "@/common/hooks/useMasterData";
import { auditLogService, type AuditLogRecord } from "@/common/services/auditLogService";
import { getAuditSummaryText } from "@/common/utils/auditLogSummary";
import { formatDate } from "@/common/utils/date";
import { ROUTES } from "@/common/constants/routes";

const { Text } = Typography;

const ACTION_COLORS: Record<string, string> = {
  CREATE:    "green",
  CHECK_IN:  "blue",
  CHECK_OUT: "orange",
  CANCEL:    "red",
  PAYMENT:   "purple",
  UPDATE:    "geekblue",
};

interface RoomHistoryContentProps {
  roomId: string;
  roomNumber: string;
  floorName: string;
}

export default function RoomHistoryContent({
  roomId,
  roomNumber,
  floorName,
}: RoomHistoryContentProps) {
  const t      = useTranslations();
  const locale = useLocale() as "en" | "vi";
  const router = useRouter();
  const { bookingStatuses, roomStatuses } = useMasterData();

  const { data, isLoading, pagination } = useTableQuery<AuditLogRecord, { roomId: string }>({
    queryKey: ["audit-log", "room", roomId],
    fetcher: ({ page, limit }) =>
      auditLogService.findAll({ roomId, page, limit }),
    externalFilters: { roomId },
  });

  const columns = [
    {
      key:       "createdAt",
      dataIndex: "createdAt",
      title:     t("common.timestamp"),
      width:     160,
      render:    (v: string) => (
        <Text style={{ fontSize: 12, whiteSpace: "nowrap" }}>
          {formatDate(v, locale)} {new Date(v).toLocaleTimeString(locale === "vi" ? "vi-VN" : "en-US", { hour: "2-digit", minute: "2-digit" })}
        </Text>
      ),
    },
    {
      key:       "action",
      dataIndex: "action",
      title:     t("common.action"),
      width:     110,
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
      width:     100,
      render:    (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      key:    "summary",
      title:  t("common.summary"),
      render: (_: unknown, row: AuditLogRecord) => (
        <Text style={{ fontSize: 12 }}>
          {getAuditSummaryText(row, { locale, t, bookingStatuses, roomStatuses })}
        </Text>
      ),
    },
    {
      key:    "actor",
      title:  t("common.actor"),
      width:  160,
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
      <AppPageHeader
        title={t("room.roomHistoryTitle", { number: roomNumber })}
        subtitle={floorName}
        translateTitle={false}
        extra={
          <Button
            icon={<IconArrowLeft size={16} />}
            onClick={() => router.push(ROUTES.ROOMS)}
          >
            {t("room.title")}
          </Button>
        }
      />

      <AppTable
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        columns={columns}
        pagination={pagination}
        locale={{ emptyText: t("room.noAuditHistory") }}
      />
    </div>
  );
}

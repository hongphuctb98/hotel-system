"use client";

import { Card, Skeleton, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useDashboardStats } from "../hooks/useDashboardStats";

export default function RoomStatusOverview() {
  const t = useTranslations();
  const { data, isLoading } = useDashboardStats();
  const stats = data?.data;

  const totalRooms =
    stats?.totalRooms ??
    (stats?.roomStatusCounts ?? []).reduce((sum, s) => sum + s.count, 0);

  return (
    <Card
      variant="borderless"
      title={t("dashboard.roomStatus")}
      extra={
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {t("dashboard.totalRooms")}: <strong>{totalRooms}</strong>
        </Typography.Text>
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <div className="space-y-3">
          {(stats?.roomStatusCounts ?? []).map((s) => (
            <div key={s.code} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <Typography.Text>{s.name}</Typography.Text>
              </div>
              <Typography.Text strong style={{ fontSize: 16 }}>
                {s.count}
              </Typography.Text>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

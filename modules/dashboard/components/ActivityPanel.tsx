"use client";

import { Card, Empty, Tabs, Tag, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useTimezone } from "@/providers/TimezoneProvider";
import { formatInTimezone } from "@/common/utils/clientTimezone";

type ActivityItem = {
  id: string;
  guestName: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
};

function ActivityList({ items, timeColor }: { items: ActivityItem[]; timeColor: string }) {
  const t = useTranslations();
  const hotelTz = useTimezone();

  if (!items.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div className="divide-y divide-gray-100">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex w-full items-center justify-between py-3 text-sm first:pt-0 last:pb-0"
        >
          <div>
            <Typography.Text strong>{item.guestName}</Typography.Text>
            <Typography.Text type="secondary" className="ml-2">
              {t("dashboard.room")} {item.roomNumber}
            </Typography.Text>
          </div>
          <Tag color={timeColor}>
            {formatInTimezone(item.checkInDate, hotelTz, "HH:mm")}
          </Tag>
        </div>
      ))}
    </div>
  );
}

export default function ActivityPanel() {
  const t = useTranslations();
  const { data, isLoading } = useDashboardStats();
  const stats = data?.data;

  return (
    <Card variant="borderless" title={t("dashboard.arrivals")} loading={isLoading}>
      <Tabs
        size="small"
        items={[
          {
            key: "arrivals",
            label: t("dashboard.arrivals"),
            children: (
              <ActivityList items={stats?.todayArrivals ?? []} timeColor="blue" />
            ),
          },
          {
            key: "departures",
            label: t("dashboard.departures"),
            children: (
              <ActivityList items={stats?.todayDepartures ?? []} timeColor="orange" />
            ),
          },
        ]}
      />
    </Card>
  );
}

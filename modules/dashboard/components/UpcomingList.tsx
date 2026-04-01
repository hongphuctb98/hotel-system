"use client";

import { Card, Empty, Tag, Tabs, Typography } from "antd";
import { useTranslations } from "next-intl";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";

export default function UpcomingList() {
  const t = useTranslations();
  const { data, isLoading } = useDashboardStats();
  const stats = data?.data;
  const { formatDate } = useLocaleCurrency();

  const renderItems = (
    items: Array<{ guestName: string; roomNumber: string; checkInDate?: string; checkOutDate?: string }>,
    color: string,
    dateKey: "checkInDate" | "checkOutDate",
  ) => {
    if (!items.length) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    return (
      <div className="divide-y divide-gray-100">
        {items.map((item, index) => (
          <div
            key={`${item.guestName}-${item.roomNumber}-${index}`}
            className="flex w-full items-center justify-between py-3 text-sm first:pt-0 last:pb-0"
          >
            <div>
              <Typography.Text strong>{item.guestName}</Typography.Text>
              <Typography.Text type="secondary" className="ml-2">
                Room {item.roomNumber}
              </Typography.Text>
            </div>
            <Tag color={color}>{formatDate(item[dateKey] ?? "")}</Tag>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card
      variant="borderless"
      title={t("dashboard.upcomingCheckIn")}
      loading={isLoading}
    >
      <Tabs
        size="small"
        items={[
          {
            key: "checkin",
            label: t("dashboard.upcomingCheckIn"),
            children: renderItems(stats?.upcomingCheckIns ?? [], "blue", "checkInDate"),
          },
          {
            key: "checkout",
            label: t("dashboard.upcomingCheckOut"),
            children: renderItems(stats?.upcomingCheckOuts ?? [], "orange", "checkOutDate"),
          },
        ]}
      />
    </Card>
  );
}

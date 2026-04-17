"use client";

import { Card, Tabs, Tag } from "antd";
import { useTranslations } from "next-intl";
import AppTable from "@/common/components/ui/AppTable";
import { useDashboardStats, type TodayBookingDTO } from "../hooks/useDashboardStats";
import { useTimezone } from "@/providers/TimezoneProvider";
import { formatInTimezone } from "@/common/utils/clientTimezone";
import PriceDisplay from "@/common/components/ui/PriceDisplay";

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  PAID: "success",
  PARTIAL: "warning",
  UNPAID: "default",
};

function BookingTable({
  items,
  loading,
}: {
  items: TodayBookingDTO[];
  loading: boolean;
}) {
  const t = useTranslations("dashboard");
  const hotelTz = useTimezone();

  const columns = [
    {
      key: "guestName",
      title: t("guest"),
      dataIndex: "guestName",
      render: (v: string) => <span className="font-medium">{v}</span>,
    },
    {
      key: "roomNumber",
      title: t("room"),
      dataIndex: "roomNumber",
      width: 70,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      key: "roomType",
      title: t("roomType"),
      dataIndex: "roomType",
    },
    {
      key: "checkInDate",
      title: t("checkIn"),
      dataIndex: "checkInDate",
      width: 100,
      render: (v: string) => formatInTimezone(v, hotelTz, "DD/MM HH:mm"),
    },
    {
      key: "checkOutDate",
      title: t("checkOut"),
      dataIndex: "checkOutDate",
      width: 100,
      render: (v: string) => formatInTimezone(v, hotelTz, "DD/MM HH:mm"),
    },
    {
      key: "paidAmount",
      title: t("paidAmount"),
      dataIndex: "paidAmount",
      width: 120,
      render: (v: number) => <PriceDisplay amount={v} isFallback={false} />,
    },
    {
      key: "dueAmount",
      title: t("dueAmount"),
      dataIndex: "dueAmount",
      width: 120,
      render: (v: number) => <PriceDisplay amount={v} isFallback={false} />,
    },
    {
      key: "paymentStatus",
      title: t("paymentStatus"),
      dataIndex: "paymentStatus",
      width: 110,
      render: (v: string) => (
        <Tag color={PAYMENT_STATUS_COLOR[v] ?? "default"}>{t(`payStatus_${v}`)}</Tag>
      ),
    },
  ];

  return (
    <AppTable<TodayBookingDTO>
      rowKey="id"
      columns={columns}
      dataSource={items}
      loading={loading}
      pagination={false}
      size="small"
    />
  );
}

export default function TodayBookingList() {
  const t = useTranslations("dashboard");
  const { data, isLoading } = useDashboardStats();
  const stats = data?.data;

  return (
    <Card variant="borderless" title={t("todayBookings")}>
      <Tabs
        size="small"
        items={[
          {
            key: "arrivals",
            label: `${t("arrivals")} (${stats?.todayArrivals.length ?? 0})`,
            children: (
              <BookingTable items={stats?.todayArrivals ?? []} loading={isLoading} />
            ),
          },
          {
            key: "departures",
            label: `${t("departures")} (${stats?.todayDepartures.length ?? 0})`,
            children: (
              <BookingTable items={stats?.todayDepartures ?? []} loading={isLoading} />
            ),
          },
        ]}
      />
    </Card>
  );
}

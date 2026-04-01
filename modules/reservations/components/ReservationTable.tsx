"use client";

import { Button, Space } from "antd";
import { IconEye, IconEdit } from "@tabler/icons-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import AppTable from "@/common/components/ui/AppTable";
import StatusBadge from "@/common/components/ui/StatusBadge";
import { useReservations } from "../hooks/useReservations";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";
import type { Booking } from "@/types/booking.types";

export default function ReservationTable() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { data, isLoading, pagination } = useReservations();
  const { format, formatDate } = useLocaleCurrency();

  const columns = [
    {
      key: "bookingNumber",
      dataIndex: "bookingNumber",
      title: t("booking.bookingNumber"),
      width: 160,
    },
    {
      key: "guest",
      title: t("booking.guest"),
      render: (_: unknown, r: Booking) =>
        `${r.guest.firstName} ${r.guest.lastName}`,
    },
    {
      key: "room",
      title: t("booking.room"),
      render: (_: unknown, r: Booking) =>
        `${r.room.number} · ${r.room.roomType.name}`,
    },
    {
      key: "checkInDate",
      dataIndex: "checkInDate",
      title: t("booking.checkIn"),
      render: (v: string) => formatDate(v),
      width: 120,
    },
    {
      key: "checkOutDate",
      dataIndex: "checkOutDate",
      title: t("booking.checkOut"),
      render: (v: string) => formatDate(v),
      width: 120,
    },
    {
      key: "status",
      title: t("booking.status"),
      render: (_: unknown, r: Booking) => (
        <StatusBadge
          color={r.bookingStatus.color}
          label={r.bookingStatus.name}
        />
      ),
      width: 130,
    },
    {
      key: "totalAmount",
      dataIndex: "totalAmount",
      title: t("booking.total"),
      render: (v: number) => format(v),
      width: 130,
    },
    {
      key: "actions",
      title: t("common.actions"),
      width: 100,
      render: (_: unknown, r: Booking) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<IconEye size={14} />}
            onClick={() => router.push(`/${locale}/reservations/${r.id}`)}
          />
          <Button
            type="text"
            size="small"
            icon={<IconEdit size={14} />}
          />
        </Space>
      ),
    },
  ];

  return (
    <AppTable
      columns={columns}
      dataSource={data}
      loading={isLoading}
      pagination={pagination}
      rowKey="id"
    />
  );
}

"use client";

import { Input, Select, Tag, Tooltip, DatePicker, Typography, Button } from "antd";
import { IconEye } from "@tabler/icons-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import AppTable from "@/common/components/ui/AppTable";
import StatusBadge from "@/common/components/ui/StatusBadge";
import PriceDisplay from "@/common/components/ui/PriceDisplay";
import { dateSorter, numberSorter, textSorter } from "@/common/components/ui/table/sorters";
import { useReservations, type BookingFilters } from "../hooks/useReservations";
import { useMasterData } from "@/common/hooks/useMasterData";
import { useTimezone } from "@/providers/TimezoneProvider";
import { formatInTimezone } from "@/common/utils/clientTimezone";
import { getBookingStatusLabel } from "@/common/utils/bookingStatusLabel";
import type { Booking } from "@/types/booking.types";

interface ReservationTableProps {
  filters: BookingFilters;
  onFiltersChange: (f: BookingFilters) => void;
}

export default function ReservationTable({
  filters,
  onFiltersChange,
}: ReservationTableProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { data, isLoading, pagination } = useReservations(filters);
  const { bookingStatuses, roomTypes } = useMasterData();
  const tz = useTimezone();

  function updateFilter(patch: Partial<BookingFilters>) {
    onFiltersChange({ ...filters, ...patch });
  }

  const columns = [
    {
      key: "bookingNumber",
      dataIndex: "bookingNumber",
      title: t("booking.bookingNumber"),
      width: 150,
      sorter: textSorter<Booking>((r) => r.bookingNumber),
      render: (v: string) => (
        <Typography.Text
          copyable={{ text: v, tooltips: [t("common.copy"), t("common.copied")] }}
          style={{ fontFamily: "monospace", fontSize: 13 }}
        >
          {v}
        </Typography.Text>
      ),
    },
    {
      key: "guest",
      title: t("booking.guest"),
      sorter: textSorter<Booking>((r) => `${r.guest.firstName} ${r.guest.lastName}`),
      render: (_: unknown, r: Booking) =>
        `${r.guest.firstName} ${r.guest.lastName}`,
    },
    {
      key: "room",
      title: t("booking.room"),
      sorter: textSorter<Booking>((r) => `${r.room.number} ${r.room.roomType.name}`),
      render: (_: unknown, r: Booking) =>
        `${r.room.number} · ${r.room.roomType.name}`,
    },
    {
      key: "checkInDate",
      dataIndex: "checkInDate",
      title: t("booking.checkIn"),
      sorter: dateSorter<Booking>((r) => r.checkInDate),
      render: (v: string) => formatInTimezone(v, tz, "DD/MM/YYYY"),
      width: 120,
    },
    {
      key: "checkOutDate",
      dataIndex: "checkOutDate",
      title: t("booking.checkOut"),
      sorter: dateSorter<Booking>((r) => r.checkOutDate),
      render: (v: string) => formatInTimezone(v, tz, "DD/MM/YYYY"),
      width: 120,
    },
    {
      key: "status",
      title: t("booking.status"),
      sorter: textSorter<Booking>((r) => r.bookingStatus.code),
      render: (_: unknown, r: Booking) => (
        <StatusBadge
          color={r.bookingStatus.color}
          label={getBookingStatusLabel(r.bookingStatus, t)}
        />
      ),
      width: 130,
    },
    {
      key: "paymentStatus",
      title: t("booking.paymentStatus"),
      width: 130,
      sorter: textSorter<Booking>((r) => {
        const inv = r.invoices?.[0];
        if (!inv) return "";
        return inv.isPaid ? "PAID" : "UNPAID";
      }),
      render: (_: unknown, r: Booking) => {
        const inv = r.invoices?.[0];
        if (!inv) return <span style={{ color: "#aaa" }}>—</span>;
        return inv.isPaid ? (
          <Tag color="success">{t("booking.paid")}</Tag>
        ) : (
          <Tag color="warning">{t("booking.unpaid")}</Tag>
        );
      },
    },
    {
      key: "totalAmount",
      dataIndex: "totalAmount",
      title: t("booking.total"),
      sorter: numberSorter<Booking>((r) => r.totalAmount),
      render: (v: number) => <PriceDisplay amount={v} isFallback={false} />,
      width: 130,
    },
    {
      key: "note",
      dataIndex: "note",
      title: t("booking.note"),
      width: 160,
      sorter: textSorter<Booking>((r) => r.note ?? ""),
      render: (v: string | null) =>
        v ? (
          <Tooltip title={v}>
            <span className="block truncate max-w-[140px]">{v}</span>
          </Tooltip>
        ) : (
          <span style={{ color: "#aaa" }}>—</span>
        ),
    },
    {
      title: t("common.actions"),
      key: "actions",
      width: 80,
      fixed: "right" as const,
      align: "center" as const, 
      render: (_: unknown, r: Booking) => (
        <Button
          type="text"
          size="small"
          icon={<IconEye size={15} />}
          onClick={() => router.push(`/${locale}/reservations/${r.id}`)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <Input.Search
          placeholder={`${t("booking.bookingNumber")} / ${t("booking.guest")}`}
          allowClear
          style={{ width: 260 }}
          value={filters.search ?? ""}
          onChange={(e) => updateFilter({ search: e.target.value || undefined })}
          onSearch={(v) => updateFilter({ search: v || undefined })}
        />
        <Select
          allowClear
          placeholder={t("booking.status")}
          style={{ minWidth: 200 }}
          value={filters.bookingStatusId}
          onChange={(v) => updateFilter({ bookingStatusId: v ?? undefined })}
          options={bookingStatuses.map((s) => ({
            value: s.id,
            label: getBookingStatusLabel(s, t),
          }))}
        />
        <Select
          allowClear
          placeholder={t("room.roomType")}
          style={{ minWidth: 160 }}
          value={filters.roomTypeId}
          onChange={(v) => updateFilter({ roomTypeId: v ?? undefined })}
          options={roomTypes.map((rt) => ({ value: rt.id, label: rt.name }))}
        />
        <DatePicker
          format="DD/MM/YYYY"
          placeholder={t("booking.checkInFrom")}
          value={filters.checkInFrom ? dayjs(filters.checkInFrom) : null}
          onChange={(date) =>
            updateFilter({
              checkInFrom: date?.format("YYYY-MM-DD") ?? undefined,
            })
          }
        />
        <DatePicker
          format="DD/MM/YYYY"
          placeholder={t("booking.checkInTo")}
          value={filters.checkInTo ? dayjs(filters.checkInTo) : null}
          onChange={(date) =>
            updateFilter({
              checkInTo: date?.format("YYYY-MM-DD") ?? undefined,
            })
          }
        />
      </div>

      <AppTable
        columns={columns}
        dataSource={data}
        loading={isLoading}
        pagination={pagination}
        rowKey="id"
        maxHeight={420}
      />
    </div>
  );
}

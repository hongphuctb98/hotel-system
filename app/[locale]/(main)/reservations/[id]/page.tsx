"use client";

import { Button, Descriptions, Spin, Table, Popconfirm, Typography, Tag, App } from "antd";
import {
  IconArrowLeft,
  IconEdit,
  IconLogin,
  IconLogout,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { use } from "react";
import { useTimezone } from "@/providers/TimezoneProvider";
import { formatInTimezone } from "@/common/utils/clientTimezone";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import AppCard from "@/common/components/ui/AppCard";
import StatusBadge from "@/common/components/ui/StatusBadge";
import PriceDisplay from "@/common/components/ui/PriceDisplay";
import { useReservation, useReservationActions } from "@/modules/reservations/hooks/useReservation";
import { useDisclosure } from "@/common/hooks/useDisclosure";
import AddServiceModal from "@/modules/billing/components/AddServiceModal";
import BookingEditModal from "@/modules/reservations/components/BookingEditModal";
import type { BookingService } from "@/types/booking.types";

export default function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { message } = App.useApp();
  const { data: booking, isLoading } = useReservation(id);
  const tz = useTimezone();
  const { checkIn, checkOut, removeService } = useReservationActions(id);
  const addServiceModal = useDisclosure();
  const editModal = useDisclosure();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  if (!booking) return null;

  const status = booking.bookingStatus;
  const canCheckIn = status.code === "CONFIRMED";
  const canCheckOut = status.code === "CHECKED_IN";

  const serviceColumns = [
    {
      key: "service",
      title: t("booking.servicesSection"),
      render: (_: unknown, r: BookingService) => r.serviceItem.name,
    },
    {
      key: "serviceDate",
      dataIndex: "serviceDate",
      title: t("billing.serviceDate"),
      render: (v: string) => formatInTimezone(v, tz, "DD/MM/YYYY"),
      width: 120,
    },
    {
      key: "quantity",
      dataIndex: "quantity",
      title: t("billing.quantity"),
      width: 80,
    },
    {
      key: "unitPrice",
      dataIndex: "unitPrice",
      title: t("billing.unitPrice"),
      render: (v: number) => <PriceDisplay amount={v} isFallback={false} />,
      width: 120,
    },
    {
      key: "totalPrice",
      dataIndex: "totalPrice",
      title: t("booking.total"),
      render: (v: number) => <PriceDisplay amount={v} isFallback={false} />,
      width: 120,
    },
    {
      key: "actions",
      width: 60,
      render: (_: unknown, r: BookingService) => (
        <Popconfirm
          title={t("common.confirmTitle")}
          onConfirm={() =>
            removeService.mutate(r.id, {
              onSuccess: () => message.success("Service removed"),
              onError: (e: Error) => message.error(e.message),
            })
          }
          okText={t("common.yes")}
          cancelText={t("common.no")}
        >
          <Button
            type="text"
            size="small"
            danger
            icon={<IconTrash size={14} />}
            loading={removeService.isPending}
          />
        </Popconfirm>
      ),
    },
  ];

  const servicesTotal = booking.services.reduce(
    (sum, s) => sum + Number(s.totalPrice),
    0
  );

  return (
    <div className="space-y-4">
      <AppPageHeader
        title={`${t("booking.bookingNumber")} #${booking.bookingNumber}`}
        translateTitle={false}
        extra={
          <div className="flex gap-2">
            <Button
              icon={<IconArrowLeft size={16} />}
              onClick={() => router.push(`/${locale}/reservations`)}
            >
              {t("common.cancel")}
            </Button>
            {/* <Button
              icon={<IconEdit size={16} />}
              onClick={editModal.open}
            >
              {t("common.edit")}
            </Button> */}
            {canCheckIn && (
              <Button
                type="primary"
                icon={<IconLogin size={16} />}
                loading={checkIn.isPending}
                onClick={() =>
                  checkIn.mutate(undefined, {
                    onSuccess: () => message.success(t("booking.doCheckIn")),
                    onError: (e: Error) => message.error(e.message),
                  })
                }
              >
                {t("booking.doCheckIn")}
              </Button>
            )}
            {canCheckOut && (
              <Button
                type="primary"
                danger
                icon={<IconLogout size={16} />}
                loading={checkOut.isPending}
                onClick={() =>
                  checkOut.mutate(undefined, {
                    onSuccess: () => message.success(t("booking.doCheckOut")),
                    onError: (e: Error) => message.error(e.message),
                  })
                }
              >
                {t("booking.doCheckOut")}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <AppCard title={t("booking.bookingInfo")}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label={t("booking.guest")}>
                {booking.guest.firstName} {booking.guest.lastName}
              </Descriptions.Item>
              <Descriptions.Item label={t("booking.room")}>
                {booking.room.number} · {booking.room.roomType.name}
              </Descriptions.Item>
              <Descriptions.Item label={t("booking.checkIn")}>
                {formatInTimezone(booking.checkInDate, tz, "DD/MM/YYYY HH:mm")}
              </Descriptions.Item>
              <Descriptions.Item label={t("booking.checkOut")}>
                {formatInTimezone(booking.checkOutDate, tz, "DD/MM/YYYY HH:mm")}
              </Descriptions.Item>
              <Descriptions.Item label="Actual Check-in">
                {formatInTimezone(booking.actualCheckIn, tz, "DD/MM/YYYY HH:mm")}
              </Descriptions.Item>
              <Descriptions.Item label="Actual Check-out">
                {formatInTimezone(booking.actualCheckOut, tz, "DD/MM/YYYY HH:mm")}
              </Descriptions.Item>
              <Descriptions.Item label={t("booking.adults")}>
                {booking.adults}
              </Descriptions.Item>
              <Descriptions.Item label={t("booking.children")}>
                {booking.children}
              </Descriptions.Item>
              <Descriptions.Item label={t("booking.source")}>
                {booking.source ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label={t("booking.status")}>
                <StatusBadge color={status.color} label={status.name} />
              </Descriptions.Item>
              {booking.note && (
                <Descriptions.Item label={t("booking.note")} span={2}>
                  {booking.note}
                </Descriptions.Item>
              )}
            </Descriptions>
          </AppCard>

          <AppCard
            title={t("booking.servicesSection")}
            extra={
              <Button
                size="small"
                icon={<IconPlus size={14} />}
                onClick={addServiceModal.open}
              >
                {t("billing.addService")}
              </Button>
            }
          >
            <Table
              columns={serviceColumns}
              dataSource={booking.services}
              rowKey="id"
              pagination={false}
              size="small"
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4} align="right">
                    <strong>{t("booking.servicesTotal")}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <strong><PriceDisplay amount={servicesTotal} isFallback={false} /></strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} />
                </Table.Summary.Row>
              )}
            />
          </AppCard>
        </div>

        <div className="space-y-4">
          <AppCard title={t("booking.charges")}>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t("booking.room")} ({booking.adults + booking.children} pax)</span>
                <PriceDisplay amount={Number(booking.totalAmount)} isFallback={false} />
              </div>
              <div className="flex justify-between">
                <span>{t("booking.servicesSection")}</span>
                <PriceDisplay amount={servicesTotal} isFallback={false} />
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Subtotal</span>
                <PriceDisplay amount={Number(booking.totalAmount) + servicesTotal} isFallback={false} />
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span>{t("booking.estimatedTotal")}</span>
                <PriceDisplay
                  amount={(Number(booking.totalAmount) + servicesTotal) * 1.1}
                  isFallback={false}
                />
              </div>
            </div>
          </AppCard>

          {booking.invoices.length > 0 && (
            <AppCard title="Invoice">
              {booking.invoices.map((inv) => (
                <div key={inv.id} className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>#{inv.invoiceNumber}</span>
                    <Tag color={inv.isPaid ? "success" : "warning"}>
                      {inv.isPaid ? t("booking.paid") : t("booking.unpaid")}
                    </Tag>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>{t("booking.total")}</span>
                    <PriceDisplay amount={Number(inv.totalAmount)} isFallback={false} />
                  </div>
                  <Button
                    size="small"
                    type="link"
                    className="p-0"
                    onClick={() =>
                      router.push(`/${locale}/billing/${inv.id}`)
                    }
                  >
                    View Invoice →
                  </Button>
                </div>
              ))}
            </AppCard>
          )}

          <AppCard title={t("booking.baseRate")}>
            <PriceDisplay amount={Number(booking.baseRate)} isFallback={false} />
            <br />
            <Typography.Text type="secondary" className="text-xs">
              {t("booking.deposit")}: <PriceDisplay amount={Number(booking.depositAmount)} isFallback={false} />
            </Typography.Text>
          </AppCard>
        </div>
      </div>

      <AddServiceModal
        bookingId={id}
        open={addServiceModal.isOpen}
        onClose={addServiceModal.close}
      />

      <BookingEditModal
        open={editModal.isOpen}
        onClose={editModal.close}
        booking={booking}
      />
    </div>
  );
}

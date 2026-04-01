"use client";

import { Button, Descriptions, Spin, Table, Popconfirm, Typography, Tag } from "antd";
import {
  IconArrowLeft,
  IconLogin,
  IconLogout,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { use } from "react";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import AppCard from "@/common/components/ui/AppCard";
import StatusBadge from "@/common/components/ui/StatusBadge";
import { useReservation, useReservationActions } from "@/modules/reservations/hooks/useReservation";
import { useDisclosure } from "@/common/hooks/useDisclosure";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";
import AddServiceModal from "@/modules/billing/components/AddServiceModal";
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
  const { data: booking, isLoading } = useReservation(id);
  const { checkIn, checkOut, removeService } = useReservationActions(id);
  const addServiceModal = useDisclosure();
  const { format, formatDate, formatDateTime } = useLocaleCurrency();

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
      title: "Service",
      render: (_: unknown, r: BookingService) => r.serviceItem.name,
    },
    {
      key: "serviceDate",
      dataIndex: "serviceDate",
      title: t("billing.serviceDate"),
      render: (v: string) => formatDate(v),
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
      render: (v: number) => format(v),
      width: 120,
    },
    {
      key: "totalPrice",
      dataIndex: "totalPrice",
      title: "Total",
      render: (v: number) => format(v),
      width: 120,
    },
    {
      key: "actions",
      width: 60,
      render: (_: unknown, r: BookingService) => (
        <Popconfirm
          title={t("common.confirmTitle")}
          onConfirm={() => removeService.mutate(r.id)}
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
        title={booking.bookingNumber}
        translateTitle={false}
        extra={
          <div className="flex gap-2">
            <Button
              icon={<IconArrowLeft size={16} />}
              onClick={() => router.push(`/${locale}/reservations`)}
            >
              Back
            </Button>
            {canCheckIn && (
              <Button
                type="primary"
                icon={<IconLogin size={16} />}
                loading={checkIn.isPending}
                onClick={() => checkIn.mutate()}
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
                onClick={() => checkOut.mutate()}
              >
                {t("booking.doCheckOut")}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <AppCard title="Booking Info">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Guest">
                {booking.guest.firstName} {booking.guest.lastName}
              </Descriptions.Item>
              <Descriptions.Item label="Room">
                {booking.room.number} · {booking.room.roomType.name}
              </Descriptions.Item>
              <Descriptions.Item label={t("booking.checkIn")}>
                {formatDate(booking.checkInDate)}
              </Descriptions.Item>
              <Descriptions.Item label={t("booking.checkOut")}>
                {formatDate(booking.checkOutDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Actual Check-in">
                {booking.actualCheckIn
                  ? formatDateTime(booking.actualCheckIn)
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Actual Check-out">
                {booking.actualCheckOut
                  ? formatDateTime(booking.actualCheckOut)
                  : "—"}
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
            title="Services"
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
                    <strong>Services Total</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <strong>{format(servicesTotal)}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} />
                </Table.Summary.Row>
              )}
            />
          </AppCard>
        </div>

        <div className="space-y-4">
          <AppCard title="Charges">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Room ({booking.adults + booking.children} pax)</span>
                <span>{format(Number(booking.totalAmount))}</span>
              </div>
              <div className="flex justify-between">
                <span>Services</span>
                <span>{format(servicesTotal)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Subtotal</span>
                <span>{format(Number(booking.totalAmount) + servicesTotal)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span>Est. Total (incl. 10% tax)</span>
                <span>
                  {format(
                    (Number(booking.totalAmount) + servicesTotal) * 1.1
                  )}
                </span>
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
                      {inv.isPaid ? t("billing.paid") : t("billing.unpaid")}
                    </Tag>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{format(Number(inv.totalAmount))}</span>
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

          <AppCard title={t("booking.ratePerNight")}>
            <Typography.Text>
              {format(Number(booking.ratePerNight))} / night
            </Typography.Text>
            <br />
            <Typography.Text type="secondary" className="text-xs">
              Deposit: {format(Number(booking.depositAmount))}
            </Typography.Text>
          </AppCard>
        </div>
      </div>

      <AddServiceModal
        bookingId={id}
        open={addServiceModal.isOpen}
        onClose={addServiceModal.close}
      />
    </div>
  );
}

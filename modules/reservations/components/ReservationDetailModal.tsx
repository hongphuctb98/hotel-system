"use client";

import { useState } from "react";
import { Modal, Descriptions, Spin, Tag, Button, App } from "antd";
import { IconEdit, IconX, IconExternalLink } from "@tabler/icons-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTimezone } from "@/providers/TimezoneProvider";
import { formatInTimezone, toHotelDayjs } from "@/common/utils/clientTimezone";
import StatusBadge from "@/common/components/ui/StatusBadge";
import PriceDisplay from "@/common/components/ui/PriceDisplay";
import { getBookingStatusLabel } from "@/common/utils/bookingStatusLabel";
import { useReservation } from "../hooks/useReservation";
import { useCancelBooking } from "../hooks/useCancelBooking";
import { useMasterData } from "@/common/hooks/useMasterData";
import { useDisclosure } from "@/common/hooks/useDisclosure";
import BookingEditModal from "./BookingEditModal";

interface ReservationDetailModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string | null;
}

export default function ReservationDetailModal({
  open,
  onClose,
  bookingId,
}: ReservationDetailModalProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { message, modal } = App.useApp();
  const editModal = useDisclosure();

  const { data: booking, isLoading } = useReservation(bookingId ?? "");
  const cancel = useCancelBooking(bookingId ?? "");
  const { bookingStatuses } = useMasterData();
  const tz = useTimezone();

  const cancelledStatus = bookingStatuses.find((s) => s.code === "CANCELLED");
  const canCancel =
    booking?.bookingStatus.code === "PENDING" ||
    booking?.bookingStatus.code === "CONFIRMED";

  const nights = booking
    ? toHotelDayjs(booking.checkOutDate, tz)!.diff(toHotelDayjs(booking.checkInDate, tz)!, "day") || 1
    : 0;

  const paymentStatusTag = (() => {
    if (!booking?.invoices?.length) return <span style={{ color: "#aaa" }}>—</span>;
    return booking.invoices[0].isPaid ? (
      <Tag color="success">{t("booking.paid")}</Tag>
    ) : (
      <Tag color="warning">{t("booking.unpaid")}</Tag>
    );
  })();

  const handleCancel = () => {
    if (!cancelledStatus) return;
    modal.confirm({
      title: t("booking.cancelAction"),
      content: t("booking.cancelConfirm"),
      okText: t("common.confirm"),
      okButtonProps: { danger: true },
      cancelText: t("common.cancel"),
      onOk: async () => {
        try {
          await cancel.mutateAsync(cancelledStatus.id);
          message.success(t("booking.cancelSuccess"));
          onClose();
        } catch {
          message.error(t("common.confirmContent"));
        }
      },
    });
  };

  const footer = booking ? (
    <div className="flex items-center justify-between">
      <Button
        type="link"
        icon={<IconExternalLink size={14} />}
        onClick={() => {
          router.push(`/${locale}/reservations/${booking.id}`);
          onClose();
        }}
      >
        {t("booking.viewFullDetails")}
      </Button>
      <div className="flex gap-2">
        {canCancel && (
          <Button
            danger
            icon={<IconX size={14} />}
            loading={cancel.isPending}
            onClick={handleCancel}
          >
            {t("booking.cancelAction")}
          </Button>
        )}
        <Button
          type="primary"
          icon={<IconEdit size={14} />}
          onClick={editModal.open}
        >
          {t("common.edit")}
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        title={booking?.bookingNumber ?? "—"}
        footer={footer}
        width={640}
        destroyOnHidden
      >
        {isLoading || !booking ? (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        ) : (
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label={t("booking.status")} span={2}>
              <StatusBadge
                color={booking.bookingStatus.color}
                label={getBookingStatusLabel(booking.bookingStatus, t)}
              />
            </Descriptions.Item>
            <Descriptions.Item label={t("booking.guest")} span={2}>
              {booking.guest.firstName} {booking.guest.lastName}
            </Descriptions.Item>
            <Descriptions.Item label={t("booking.room")}>
              {booking.room.number} · {booking.room.roomType.name}
            </Descriptions.Item>
            <Descriptions.Item label={t("room.floor")}>
              {booking.room.floor.name}
            </Descriptions.Item>
            <Descriptions.Item label={t("booking.checkIn")}>
              {formatInTimezone(booking.checkInDate, tz, "DD/MM/YYYY HH:mm")}
            </Descriptions.Item>
            <Descriptions.Item label={t("booking.checkOut")}>
              {formatInTimezone(booking.checkOutDate, tz, "DD/MM/YYYY HH:mm")}
            </Descriptions.Item>
            <Descriptions.Item label={t("booking.nights")}>
              {nights}
            </Descriptions.Item>
            <Descriptions.Item label={t("booking.adults")}>
              {booking.adults}
            </Descriptions.Item>
            <Descriptions.Item label={t("booking.children")}>
              {booking.children}
            </Descriptions.Item>
            <Descriptions.Item label={t("booking.chargeType")}>
              {booking.chargeType === "hourly" ? t("booking.hourly") : t("booking.nightly")}
            </Descriptions.Item>
            <Descriptions.Item label={t("booking.baseRate")}>
              <PriceDisplay amount={booking.baseRate} isFallback={false} />
            </Descriptions.Item>
            <Descriptions.Item label={t("booking.total")}>
              <PriceDisplay amount={booking.totalAmount} isFallback={false} />
            </Descriptions.Item>
            <Descriptions.Item label={t("booking.paymentStatus")}>
              {paymentStatusTag}
            </Descriptions.Item>
            <Descriptions.Item label={t("booking.source")}>
              {booking.source ?? "—"}
            </Descriptions.Item>
            {booking.note && (
              <Descriptions.Item label={t("booking.note")} span={2}>
                {booking.note}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {booking && (
        <BookingEditModal
          open={editModal.isOpen}
          onClose={editModal.close}
          booking={booking}
        />
      )}
    </>
  );
}

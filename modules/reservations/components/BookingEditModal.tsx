"use client";

import { useEffect } from "react";
import { Modal, Form, InputNumber, Select, Input, Descriptions, App } from "antd";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import { useUpdateBooking } from "../hooks/useUpdateBooking";
import type { Booking } from "@/types/booking.types";

interface BookingEditModalProps {
  open: boolean;
  onClose: () => void;
  booking: Booking;
}

export default function BookingEditModal({ open, onClose, booking }: BookingEditModalProps) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const update = useUpdateBooking(booking.id);

  const chargeType = Form.useWatch("chargeType", form);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        adults: booking.adults,
        children: booking.children,
        chargeType: booking.chargeType ?? "nightly",
        baseRate: Number(booking.baseRate),
        discountAmount: Number(booking.discountAmount ?? 0),
        surchargeAmount: Number(booking.surchargeAmount ?? 0),
        hourlyBlockHours: booking.hourlyBlockHours ?? undefined,
        hourlyRatePerHour: booking.hourlyRatePerHour ?? undefined,
        source: booking.source ?? "",
        note: booking.note ?? "",
      });
    }
  }, [open, booking, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await update.mutateAsync({
        adults: values.adults,
        children: values.children,
        chargeType: values.chargeType,
        baseRate: values.baseRate,
        discountAmount: values.discountAmount ?? 0,
        surchargeAmount: values.surchargeAmount ?? 0,
        hourlyBlockHours: values.chargeType === "hourly" ? values.hourlyBlockHours : null,
        hourlyRatePerHour: values.chargeType === "hourly" ? values.hourlyRatePerHour : null,
        source: values.source || null,
        note: values.note || null,
      });
      message.success(t("booking.updateSuccess"));
      onClose();
    } catch {
      // form validation errors shown inline; API errors surfaced via Ant Design's error message
    }
  };

  const nights =
    dayjs(booking.checkOutDate).diff(dayjs(booking.checkInDate), "day") || 1;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={t("booking.editTitle")}
      okText={t("booking.updateAction")}
      onOk={handleOk}
      confirmLoading={update.isPending}
      width={560}
      destroyOnHidden
    >
      {/* Read-only context */}
      <Descriptions size="small" column={2} className="mb-4">
        <Descriptions.Item label={t("booking.room")}>
          {booking.room.number} · {booking.room.roomType.name}
        </Descriptions.Item>
        <Descriptions.Item label={t("booking.nights")}>
          {nights}
        </Descriptions.Item>
        <Descriptions.Item label={t("booking.checkIn")}>
          {dayjs(booking.checkInDate).format("DD/MM/YYYY")}
        </Descriptions.Item>
        <Descriptions.Item label={t("booking.checkOut")}>
          {dayjs(booking.checkOutDate).format("DD/MM/YYYY")}
        </Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical">
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item name="adults" label={t("booking.adults")} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="children" label={t("booking.children")}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </div>

        <Form.Item name="chargeType" label={t("booking.chargeType")} rules={[{ required: true }]}>
          <Select
            options={[
              { value: "nightly", label: t("booking.nightly") },
              { value: "hourly",  label: t("booking.hourly") },
            ]}
          />
        </Form.Item>

        {chargeType === "hourly" && (
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="hourlyBlockHours" label={t("booking.blockHours")}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="hourlyRatePerHour" label={t("booking.hourlyRate")}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </div>
        )}

        <Form.Item name="baseRate" label={t("booking.baseRate")} rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>

        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item name="discountAmount" label={t("booking.discount")}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="surchargeAmount" label={t("booking.surcharge")}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </div>

        <Form.Item name="source" label={t("booking.source")}>
          <Input />
        </Form.Item>

        <Form.Item name="note" label={t("booking.note")}>
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

"use client";

import { Form, Select, InputNumber, DatePicker, Input, Button } from "antd";
import AppModal from "@/common/components/ui/AppModal";
import { useMasterData } from "@/common/hooks/useMasterData";
import { useReservationActions } from "@/modules/reservations/hooks/useReservation";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";

interface AddServiceModalProps {
  bookingId: string;
  open: boolean;
  onClose: () => void;
}

export default function AddServiceModal({
  bookingId,
  open,
  onClose,
}: AddServiceModalProps) {
  const t = useTranslations();
  const [form] = Form.useForm();
  const { serviceItems } = useMasterData();
  const { addService } = useReservationActions(bookingId);

  const handleServiceChange = (id: string) => {
    const item = serviceItems.find((s) => s.id === id);
    if (item) form.setFieldValue("unitPrice", Number(item.unitPrice));
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await addService.mutateAsync({
      ...values,
      serviceDate: values.serviceDate
        ? dayjs(values.serviceDate).toISOString()
        : undefined,
    });
    form.resetFields();
    onClose();
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={t("billing.addService")}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            type="primary"
            loading={addService.isPending}
            onClick={handleSubmit}
          >
            {t("common.save")}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ quantity: 1, serviceDate: dayjs() }}
      >
        <Form.Item
          name="serviceItemId"
          label={t("nav.masterData.serviceItems")}
          rules={[{ required: true }]}
        >
          <Select
            placeholder="Select service"
            showSearch
            optionFilterProp="label"
            options={serviceItems.map((s) => ({ value: s.id, label: s.name }))}
            onChange={handleServiceChange}
          />
        </Form.Item>
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="quantity"
            label={t("billing.quantity")}
            rules={[{ required: true }]}
          >
            <InputNumber className="w-full" min={1} />
          </Form.Item>
          <Form.Item name="unitPrice" label={t("billing.unitPrice")}>
            <InputNumber className="w-full" min={0} precision={2} />
          </Form.Item>
        </div>
        <Form.Item name="serviceDate" label={t("billing.serviceDate")}>
          <DatePicker className="w-full" />
        </Form.Item>
        <Form.Item name="note" label={t("booking.note")}>
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </AppModal>
  );
}

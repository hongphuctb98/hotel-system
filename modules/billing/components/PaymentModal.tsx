"use client";

import { useEffect } from "react";
import { App, Form, Select, InputNumber, Input, Button } from "antd";
import AppModal from "@/common/components/ui/AppModal";
import { useMasterData } from "@/common/hooks/useMasterData";
import { useInvoiceActions } from "@/modules/billing/hooks/useInvoice";
import { useTranslations } from "next-intl";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";
import { formatNumberInput, parseNumberInput } from "@/common/utils/numberInput";
import TextArea from "antd/es/input/TextArea";

interface PaymentModalProps {
  invoiceId: string;
  outstanding: number;
  open: boolean;
  onClose: () => void;
}

export default function PaymentModal({
  invoiceId,
  outstanding,
  open,
  onClose,
}: PaymentModalProps) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { paymentMethods } = useMasterData();
  const { pay } = useInvoiceActions(invoiceId);
  const { format } = useLocaleCurrency();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ amount: outstanding });
  }, [open, outstanding, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await pay.mutateAsync(values);
      message.success(t("billing.paymentRecorded"));
      form.resetFields();
      onClose();
    } catch (e) {
      if (e instanceof Error) {
        message.error(e.message);
      }
      // Ant Design validation rejection is a plain object — field errors are shown inline, nothing to display
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={t("billing.payNow")}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="primary" loading={pay.isPending} onClick={handleSubmit}>
            {t("common.confirm")}
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-gray-500">
        {t("billing.outstanding")}: <strong>{format(outstanding)}</strong>
      </p>
      <Form form={form} layout="vertical" initialValues={{ amount: outstanding }}>
        <Form.Item
          name="paymentMethodId"
          label={t("billing.paymentMethod").replace("#", "Method")}
          rules={[{ required: true }]}
        >
          <Select
            placeholder={t("billing.selectPaymentMethod")}
            options={paymentMethods.map((pm) => ({
              value: pm.id,
              label: pm.name,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="amount"
          label={t("billing.amount")}
          rules={[{ required: true, type: "number", min: 0.01 }]}
        >
          <InputNumber<number>
            className="w-full"
            min={0}
            style={{ width: "100%" }}
            formatter={(value) => formatNumberInput(value, {})}
            parser={(value) => parseNumberInput(value)}
          />
        </Form.Item>
        <Form.Item name="reference" label={t("common.note")}>
          <TextArea  placeholder={t("common.note")} maxLength={4} />
        </Form.Item>
      </Form>
    </AppModal>
  );
}

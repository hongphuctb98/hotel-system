"use client";

import { Form, Select, InputNumber, Input, Button } from "antd";
import AppModal from "@/common/components/ui/AppModal";
import { useMasterData } from "@/common/hooks/useMasterData";
import { useInvoiceActions } from "@/modules/billing/hooks/useInvoice";
import { useTranslations } from "next-intl";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";

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
  const [form] = Form.useForm();
  const { paymentMethods } = useMasterData();
  const { pay } = useInvoiceActions(invoiceId);
  const { format } = useLocaleCurrency();

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await pay.mutateAsync(values);
    form.resetFields();
    onClose();
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
        Outstanding: <strong>{format(outstanding)}</strong>
      </p>
      <Form form={form} layout="vertical" initialValues={{ amount: outstanding }}>
        <Form.Item
          name="paymentMethodId"
          label={t("billing.invoiceNumber").replace("#", "Method")}
          rules={[{ required: true }]}
        >
          <Select
            placeholder="Select payment method"
            options={paymentMethods.map((pm) => ({
              value: pm.id,
              label: pm.name,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="amount"
          label="Amount"
          rules={[{ required: true, type: "number", min: 0.01 }]}
        >
          <InputNumber className="w-full" min={0} precision={2} />
        </Form.Item>
        <Form.Item name="reference" label="Reference / Note">
          <Input placeholder="e.g. transaction ID" />
        </Form.Item>
      </Form>
    </AppModal>
  );
}

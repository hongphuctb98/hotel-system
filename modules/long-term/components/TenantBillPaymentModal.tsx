"use client";

import { Form, Button, InputNumber, DatePicker, Select, Input, App, Modal, Row, Col, Space } from "antd";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import { useAddPayment } from "../hooks/useTenantBills";
import { useMasterData } from "@/common/hooks/useMasterData";
import { formatNumberInput, parseNumberInput } from "@/common/utils/numberInput";
import { getLongTermApiErrorMessage } from "@/common/utils/longTermApiErrorMessage";

interface TenantBillPaymentModalProps {
  open: boolean;
  onClose: () => void;
  bill: Record<string, unknown> | null;
}

export default function TenantBillPaymentModal({ open, onClose, bill }: TenantBillPaymentModalProps) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const addPayment = useAddPayment();
  const { paymentMethods } = useMasterData();

  const outstanding = bill ? (bill.totalAmount as number) - (bill.totalPaid as number) : 0;

  async function handleSubmit(values: Record<string, unknown>) {
    if (!bill) return;
    try {
      await addPayment.mutateAsync({
        billId: bill.id as string,
        data: {
          ...values,
          paymentDate: (values.paymentDate as dayjs.Dayjs).toISOString(),
        },
      });
      message.success(t("longTerm.bill.addPaymentSuccess"));
      onClose();
      form.resetFields();
    } catch (err: unknown) {
      message.error(getLongTermApiErrorMessage(err, t));
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={t("longTerm.bill.addPaymentAction")}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="primary" loading={addPayment.isPending} onClick={form.submit}>
            {t("longTerm.bill.addPaymentAction")}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ paymentDate: dayjs() }}
      >
        <Row gutter={[16, 0]}>
          <Col xs={24}>
            <Form.Item
              label={t("longTerm.bill.totalAmount")}
              extra={`${t("longTerm.bill.outstandingBalance")}: ${outstanding.toLocaleString()} VND`}
              required
            >
              <Space.Compact style={{ width: "100%" }}>
                <Form.Item
                  name="amount"
                  noStyle
                  rules={[
                    { required: true, message: "Required" },
                    { type: "number", max: outstanding, message: `Max: ${outstanding.toLocaleString()} VND` },
                  ]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={1}
                    max={outstanding}
                    formatter={(v) => formatNumberInput(v, {})}
                    parser={(v) => parseNumberInput(v) as number}
                  />
                </Form.Item>
                <Input readOnly value="VND" style={{ width: "auto", minWidth: 52, textAlign: "center", cursor: "default" }} tabIndex={-1} />
              </Space.Compact>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="paymentDate" label={t("longTerm.bill.paymentDate")} rules={[{ required: true }]}>
              <DatePicker format="DD/MM/YYYY" className="w-full" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="paymentMethodId" label={t("longTerm.bill.paymentMethod")} rules={[{ required: true }]}>
              <Select
                options={paymentMethods.map((pm: { id: string; name: string }) => ({ value: pm.id, label: pm.name }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="notes" label={t("longTerm.bill.paymentNotes")}>
              <Input.TextArea rows={2} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

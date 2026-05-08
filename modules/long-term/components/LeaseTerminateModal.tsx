"use client";

import { Form, Button, DatePicker, Input, App, Modal } from "antd";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import { useTerminateLease } from "../hooks/useLeases";
import { getLongTermApiErrorMessage } from "@/common/utils/longTermApiErrorMessage";

interface LeaseTerminateModalProps {
  open: boolean;
  onClose: () => void;
  lease: Record<string, unknown> | null;
}

export default function LeaseTerminateModal({ open, onClose, lease }: LeaseTerminateModalProps) {
  const t = useTranslations();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const terminate = useTerminateLease();

  async function handleSubmit(values: { terminationDate: dayjs.Dayjs; terminationReason?: string }) {
    if (!lease) return;
    try {
      await terminate.mutateAsync({
        id: lease.id as string,
        data: {
          terminationDate: values.terminationDate.toISOString(),
          terminationReason: values.terminationReason,
        },
      });
      message.success(t("longTerm.lease.terminateSuccess"));
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
      title={t("longTerm.lease.terminateAction")}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button danger loading={terminate.isPending} onClick={form.submit}>
            {t("longTerm.lease.terminateAction")}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ terminationDate: dayjs() }}
      >
        <Form.Item name="terminationDate" label={t("longTerm.lease.terminationDate")} rules={[{ required: true }]}>
          <DatePicker format="DD/MM/YYYY" className="w-full" />
        </Form.Item>
        <Form.Item name="terminationReason" label={t("longTerm.lease.terminationReason")}>
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

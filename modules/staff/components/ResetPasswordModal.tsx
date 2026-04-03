"use client";

import { Form, Input, Button, App } from "antd";
import { useTranslations } from "next-intl";
import AppModal from "@/common/components/ui/AppModal";
import { useResetStaffPassword } from "../hooks/useStaffMutations";
import type { StaffMember } from "@/types/staff.types";

type Props = {
  open: boolean;
  onClose: () => void;
  staff: StaffMember | null;
};

export default function ResetPasswordModal({ open, onClose, staff }: Props) {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const resetPassword = useResetStaffPassword();

  const handleOk = async () => {
    const values = await form.validateFields();
    resetPassword.mutate(
      { id: staff!.id, newPassword: values.newPassword },
      {
        onSuccess: () => {
          message.success(t("resetPasswordSuccess"));
          form.resetFields();
          onClose();
        },
        onError: () => message.error(t("resetPasswordFailed")),
      }
    );
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={t("resetPasswordTitle")}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onClose}>{tCommon("cancel")}</Button>
          <Button
            type="primary"
            loading={resetPassword.isPending}
            onClick={handleOk}
          >
            {t("resetPasswordAction")}
          </Button>
        </div>
      }
      afterOpenChange={(visible) => { if (!visible) form.resetFields(); }}
    >
      {staff && (
        <Form form={form} layout="vertical">
          <Form.Item
            name="newPassword"
            label={t("newPassword")}
            rules={[{ required: true, min: 6 }]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      )}
    </AppModal>
  );
}

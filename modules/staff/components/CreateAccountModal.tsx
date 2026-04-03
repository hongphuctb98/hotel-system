"use client";

import { Form, Input, Select, Button, App } from "antd";
import { useTranslations } from "next-intl";
import AppModal from "@/common/components/ui/AppModal";
import { useCreateStaffAccount } from "../hooks/useStaffMutations";
import { ApiError } from "@/common/services/apiClient";
import type { StaffMember } from "@/types/staff.types";
import type { UserRole } from "@/types/auth.types";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "HOUSEKEEPING", label: "Housekeeping" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  staff: StaffMember | null;
};

export default function CreateAccountModal({ open, onClose, staff }: Props) {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const createAccount = useCreateStaffAccount();

  const handleSubmit = async () => {
    if (!staff) return;
    const values = await form.validateFields();
    createAccount.mutate(
      {
        id: staff.id,
        data: { accountEmail: values.accountEmail, password: values.password, role: values.role },
      },
      {
        onSuccess: () => {
          message.success(t("createAccountSuccess"));
          form.resetFields();
          onClose();
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === "STAFF_ACCOUNT_EMAIL_TAKEN") {
            form.setFields([{ name: "accountEmail", errors: [t("emailTaken")] }]);
          } else {
            message.error(t("createAccountFailed"));
          }
        },
      }
    );
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      title={`${t("createAccountTitle")} — ${staff?.name ?? ""}`}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={handleClose}>{tCommon("cancel")}</Button>
          <Button type="primary" loading={createAccount.isPending} onClick={handleSubmit}>
            {t("createAccountAction")}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
        initialValues={{ role: "RECEPTIONIST" }}
      >
        <Form.Item
          name="accountEmail"
          label={t("accountEmail")}
          rules={[{ required: true, type: "email" }]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="password"
          label={t("password")}
          rules={[{ required: true, min: 6 }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item name="role" label={t("role")} rules={[{ required: true }]}>
          <Select options={ROLE_OPTIONS} />
        </Form.Item>
      </Form>
    </AppModal>
  );
}

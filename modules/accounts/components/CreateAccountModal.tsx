"use client";

import { Form, Input, Select, Button, App, Empty } from "antd";
import { useTranslations } from "next-intl";
import AppModal from "@/common/components/ui/AppModal";
import { useCreateAccount } from "../hooks/useAccountMutations";
import { useUnlinkedStaff } from "../hooks/useUnlinkedStaff";
import { ApiError } from "@/common/services/apiClient";
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
};

export default function CreateAccountModal({ open, onClose }: Props) {
  const t = useTranslations("accounts");
  const tCommon = useTranslations("common");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const createAccount = useCreateAccount();
  const { data: unlinkedStaff = [], isLoading: staffLoading } = useUnlinkedStaff();

  const staffOptions = unlinkedStaff.map((s) => ({
    value: s.id,
    label: s.name,
    searchLabel: `${s.name} ${s.contactEmail ?? ""}`.toLowerCase(),
  }));

  const allLinked = !staffLoading && unlinkedStaff.length === 0;

  const handleSubmit = async () => {
    const values = await form.validateFields();
    createAccount.mutate(
      {
        id: values.staffId,
        data: { accountEmail: values.accountEmail, password: values.password, role: values.role },
      },
      {
        onSuccess: () => {
          message.success(t("createSuccess"));
          form.resetFields();
          onClose();
        },
        onError: (err) => {
          if (err instanceof ApiError && err.code === "STAFF_ACCOUNT_EMAIL_TAKEN") {
            form.setFields([{ name: "accountEmail", errors: [t("emailTaken")] }]);
          } else {
            message.error(t("createFailed"));
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
      title={t("createAccount")}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={handleClose}>{tCommon("cancel")}</Button>
          <Button
            type="primary"
            loading={createAccount.isPending}
            onClick={handleSubmit}
            disabled={allLinked}
          >
            {t("createAccount")}
          </Button>
        </div>
      }
    >
      {allLinked ? (
        <Empty description={t("noUnlinkedStaff")} />
      ) : (
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
          initialValues={{ role: "RECEPTIONIST" }}
        >
          <Form.Item
            name="staffId"
            label={t("staffPlaceholder")}
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              loading={staffLoading}
              placeholder={t("staffPlaceholder")}
              filterOption={(input, option) =>
                (option?.searchLabel ?? "").includes(input.toLowerCase())
              }
              options={staffOptions}
            />
          </Form.Item>
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
            rules={[{ required: true, min: 8 }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="role" label={t("role")} rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      )}
    </AppModal>
  );
}

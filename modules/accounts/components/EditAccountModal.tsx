"use client";

import { Form, Select, Switch, Button, App } from "antd";
import { useTranslations } from "next-intl";
import AppModal from "@/common/components/ui/AppModal";
import { useUpdateAccount } from "../hooks/useAccountMutations";
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

export default function EditAccountModal({ open, onClose, staff }: Props) {
  const t = useTranslations("accounts");
  const tCommon = useTranslations("common");
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const updateAccount = useUpdateAccount();

  const handleSubmit = async () => {
    if (!staff) return;
    const values = await form.validateFields();
    updateAccount.mutate(
      { id: staff.id, data: { role: values.role, isActive: values.isActive } },
      {
        onSuccess: () => {
          message.success(t("editSuccess"));
          onClose();
        },
        onError: () => message.error(t("editFailed")),
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
      title={`${t("editAccount")} — ${staff?.name ?? ""}`}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={handleClose}>{tCommon("cancel")}</Button>
          <Button type="primary" loading={updateAccount.isPending} onClick={handleSubmit}>
            {tCommon("save")}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
        initialValues={{ role: staff?.role, isActive: staff?.accountIsActive ?? true }}
      >
        <Form.Item name="role" label={t("role")} rules={[{ required: true }]}>
          <Select options={ROLE_OPTIONS} />
        </Form.Item>
        <Form.Item name="isActive" label={t("accountStatus")} valuePropName="checked">
          <Switch checkedChildren={tCommon("active")} unCheckedChildren={tCommon("inactive")} />
        </Form.Item>
      </Form>
    </AppModal>
  );
}

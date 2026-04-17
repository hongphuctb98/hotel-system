"use client";

import { useState } from "react";
import { Button, Select, Space, Tag } from "antd";
import { IconEdit, IconKey } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import AppTable from "@/common/components/ui/AppTable";
import { useAccounts } from "../hooks/useAccounts";
import EditAccountModal from "./EditAccountModal";
import ResetPasswordModal from "@/modules/staff/components/ResetPasswordModal";
import type { StaffMember } from "@/types/staff.types";
import type { UserRole } from "@/types/auth.types";

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: "red",
  MANAGER: "blue",
  RECEPTIONIST: "green",
  HOUSEKEEPING: "orange",
};

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "HOUSEKEEPING", label: "Housekeeping" },
];

export default function AccountsTable() {
  const t = useTranslations("accounts");
  const tCommon = useTranslations("common");

  const { data, isLoading, pagination, filters, setFilters } = useAccounts();

  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const columns = [
    {
      key: "name",
      title: t("staffName"),
      dataIndex: "name",
      render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
      key: "accountEmail",
      title: t("accountEmail"),
      dataIndex: "accountEmail",
    },
    {
      key: "role",
      title: t("role"),
      dataIndex: "role",
      render: (role: UserRole | null) =>
        role ? <Tag color={ROLE_COLORS[role]}>{role}</Tag> : null,
    },
    {
      key: "accountStatus",
      title: t("accountStatus"),
      render: (_: unknown, s: StaffMember) =>
        s.accountIsActive ? (
          <Tag color="success">{tCommon("active")}</Tag>
        ) : (
          <Tag color="default">{tCommon("inactive")}</Tag>
        ),
      width: 120,
    },
    {
      key: "actions",
      title: tCommon("actions"),
      width: 100,
      render: (_: unknown, s: StaffMember) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<IconEdit size={14} />}
            onClick={() => { setEditTarget(s); setEditOpen(true); }}
            title={t("editAccount")}
          />
          <Button
            type="text"
            size="small"
            icon={<IconKey size={14} />}
            onClick={() => { setResetTarget(s); setResetOpen(true); }}
            title={t("resetPassword")}
          />
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="flex gap-3 mb-4">
        <Select
          allowClear
          placeholder={t("filterByRole")}
          style={{ width: 200 }}
          options={ROLE_OPTIONS}
          onChange={(v) => setFilters((f) => ({ ...f, role: v }))}
        />
      </div>

      <AppTable<StaffMember>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={isLoading}
        pagination={pagination}
        rowClassName={(s) => (!s.accountIsActive ? "opacity-50" : "")}
      />

      <EditAccountModal
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditTarget(null); }}
        staff={editTarget}
      />
      <ResetPasswordModal
        open={resetOpen}
        onClose={() => { setResetOpen(false); setResetTarget(null); }}
        staff={resetTarget}
      />
    </>
  );
}

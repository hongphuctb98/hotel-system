"use client";

import { useState } from "react";
import { App, Avatar, Button, Select, Space, Switch, Tag } from "antd";
import {
  IconEdit,
  IconKey,
  IconPower,
  IconPlus,
  IconUser,
  IconUserPlus,
} from "@tabler/icons-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import AppTable from "@/common/components/ui/AppTable";
import { booleanSorter, textSorter } from "@/common/components/ui/table/sorters";
import { useConfirm } from "@/common/hooks/useConfirm";
import { usePermission } from "@/common/hooks/usePermission";
import { PERMISSIONS } from "@/common/constants/permissions";
import { useAuthRole } from "@/providers/AuthRoleProvider";
import { useStaff } from "../hooks/useStaff";
import { useDeleteStaff } from "../hooks/useStaffMutations";
import ResetPasswordModal from "./ResetPasswordModal";
import CreateAccountModal from "./CreateAccountModal";
import type { StaffMember } from "@/types/staff.types";
import type { UserRole } from "@/types/auth.types";

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: "red",
  MANAGER: "blue",
  RECEPTIONIST: "green",
  HOUSEKEEPING: "orange",
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "HOUSEKEEPING", label: "Housekeeping" },
];

export default function StaffTable() {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const { message } = App.useApp();
  const { role, userId: currentUserId } = useAuthRole();
  const { hasPermission } = usePermission(role);
  const canManage = hasPermission(PERMISSIONS.STAFF_MANAGE);
  const router = useRouter();
  const locale = useLocale();

  const { data, isLoading, pagination, filters, setFilters } = useStaff();
  const deleteStaff = useDeleteStaff();
  const { confirm } = useConfirm();

  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [createAccountTarget, setCreateAccountTarget] = useState<StaffMember | null>(null);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);

  const handleEdit = (s: StaffMember) => {
    router.push(`/${locale}/staff/${s.id}/edit`);
  };

  const handleResetPassword = (s: StaffMember) => {
    setResetTarget(s);
    setResetModalOpen(true);
  };

  const handleCreateAccount = (s: StaffMember) => {
    setCreateAccountTarget(s);
    setCreateAccountOpen(true);
  };

  const handleDeactivate = (s: StaffMember) => {
    confirm({
      title: t("deactivateTitle"),
      content: t("deactivateConfirm"),
      danger: true,
      onOk: () =>
        deleteStaff.mutate(s.id, {
          onSuccess: () => message.success(t("deactivateSuccess")),
          onError: () => message.error(t("deactivateFailed")),
        }),
    });
  };

  const columns = [
    {
      key: "name",
      title: t("name"),
      sorter: textSorter<StaffMember>((s) => s.name),
      render: (_: unknown, s: StaffMember) => (
        <Space size={8}>
          {s.avatarUrl ? (
            <Avatar src={s.avatarUrl} size={32} />
          ) : (
            <Avatar icon={<IconUser size={16} />} size={32} />
          )}
          <span>{s.name}</span>
        </Space>
      ),
      width: 200,
    },
    {
      key: "contactEmail",
      dataIndex: "contactEmail",
      title: t("contactEmail"),
      sorter: textSorter<StaffMember>((s) => s.contactEmail ?? ""),
      render: (v: string | null) => v ?? "—",
      width: 200,
    },
    {
      key: "phone",
      dataIndex: "phone",
      title: t("phone"),
      sorter: textSorter<StaffMember>((s) => s.phone ?? ""),
      render: (v: string | null) => v ?? "—",
      width: 130,
    },
    {
      key: "role",
      title: t("role"),
      sorter: textSorter<StaffMember>((s) => s.role ?? ""),
      render: (_: unknown, s: StaffMember) =>
        s.role ? (
          <Tag color={ROLE_COLORS[s.role]}>{s.role}</Tag>
        ) : (
          <span style={{ color: "#aaa" }}>—</span>
        ),
      width: 130,
    },
    {
      key: "position",
      dataIndex: "position",
      title: t("position"),
      sorter: textSorter<StaffMember>((s) => s.position ?? ""),
      render: (v: string | null) => v ?? "—",
      width: 160,
    },
    {
      key: "accountStatus",
      title: t("accountStatus"),
      sorter: booleanSorter<StaffMember>((s) => s.accountIsActive),
      render: (_: unknown, s: StaffMember) => {
        if (!s.hasAccount) {
          return <Tag color="warning">{t("noAccount")}</Tag>;
        }
        if (s.accountIsActive) {
          return <Tag color="success">{t("accountActive")}</Tag>;
        }
        return <Tag color="default">{t("accountInactive")}</Tag>;
      },
      width: 130,
    },
    {
      key: "status",
      title: tCommon("status"),
      sorter: booleanSorter<StaffMember>((s) => s.isActive),
      render: (_: unknown, s: StaffMember) => (
        <Tag color={s.isActive ? "success" : "default"}>
          {s.isActive ? tCommon("active") : tCommon("inactive")}
        </Tag>
      ),
      width: 100,
    },
    {
      key: "actions",
      title: tCommon("actions"),
      width: 140,
      fixed: "right" as const,
      render: (_: unknown, s: StaffMember) => {
        const isSelf = !!currentUserId && s.userId === currentUserId;
        return (
          <Space size={4}>
            {canManage && (
              <Button
                type="text"
                size="small"
                icon={<IconEdit size={14} />}
                onClick={() => handleEdit(s)}
              />
            )}
            {canManage && !s.hasAccount && (
              <Button
                type="text"
                size="small"
                icon={<IconUserPlus size={14} />}
                onClick={() => handleCreateAccount(s)}
                title={t("createAccountTitle")}
              />
            )}
            {canManage && s.hasAccount && !isSelf && (
              <Button
                type="text"
                size="small"
                icon={<IconKey size={14} />}
                onClick={() => handleResetPassword(s)}
                title={t("resetPasswordTitle")}
              />
            )}
            {canManage && s.isActive && !isSelf && (
              <Button
                type="text"
                size="small"
                danger
                icon={<IconPower size={14} />}
                onClick={() => handleDeactivate(s)}
                title={t("deactivateTitle")}
              />
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
          gap: 8,
        }}
      >
        <Space wrap>
          <Select
            allowClear
            placeholder={t("filterByRole")}
            style={{ width: 160 }}
            options={ROLE_OPTIONS}
            onChange={(v) => setFilters((prev) => ({ ...prev, role: v }))}
            value={filters.role}
          />
          <Space size={8}>
            <Switch
              size="small"
              checked={!!filters.showInactive}
              onChange={(checked) =>
                setFilters((prev) => ({ ...prev, showInactive: checked }))
              }
            />
            <span style={{ fontSize: 13 }}>{t("showInactive")}</span>
          </Space>
        </Space>

        {canManage && (
          <Button
            type="primary"
            icon={<IconPlus size={16} />}
            onClick={() => router.push(`/${locale}/staff/new`)}
          >
            {t("createTitle")}
          </Button>
        )}
      </div>

      <AppTable
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        columns={columns}
        pagination={pagination}
        maxHeight={620}
        rowClassName={(s: StaffMember) => (!s.isActive ? "opacity-50" : "")}
      />

      <ResetPasswordModal
        open={resetModalOpen}
        onClose={() => {
          setResetModalOpen(false);
          setResetTarget(null);
        }}
        staff={resetTarget}
      />
      <CreateAccountModal
        open={createAccountOpen}
        onClose={() => {
          setCreateAccountOpen(false);
          setCreateAccountTarget(null);
        }}
        staff={createAccountTarget}
      />
    </>
  );
}

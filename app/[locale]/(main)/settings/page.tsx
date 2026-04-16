"use client";

import { Result } from "antd";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import SettingsForm from "@/modules/settings/components/SettingsForm";
import { usePermission } from "@/common/hooks/usePermission";
import { PERMISSIONS } from "@/common/constants/permissions";
import { useAuthRole } from "@/providers/AuthRoleProvider";

export default function SettingsPage() {
  const { role } = useAuthRole();
  const { hasPermission } = usePermission(role);

  if (!hasPermission(PERMISSIONS.SETTINGS_MANAGE)) {
    return <Result status="403" title="403" subTitle="You do not have permission to access this page." />;
  }

  return (
    <div className="space-y-6">
      <AppPageHeader title="settings.title" />
      <SettingsForm />
    </div>
  );
}

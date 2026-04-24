"use client";

import { useState } from "react";
import { Result } from "antd";
import { useTranslations } from "next-intl";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import { useAuthRole } from "@/providers/AuthRoleProvider";
import { usePermission } from "@/common/hooks/usePermission";
import { PERMISSIONS } from "@/common/constants/permissions";
import InventoryFiltersBar from "@/modules/inventory/components/InventoryFilters";
import InventoryTable from "@/modules/inventory/components/InventoryTable";
import type { InventoryFilters } from "@/common/services/inventoryService";

export default function InventoryPage() {
  const t = useTranslations("inventory");
  const { role } = useAuthRole();
  const { hasPermission } = usePermission(role);
  const [filters, setFilters] = useState<InventoryFilters>({});

  if (!hasPermission(PERMISSIONS.INVENTORY_VIEW)) {
    return <Result status="403" title="403" subTitle="You do not have permission to access this page." />;
  }

  const canManage = hasPermission(PERMISSIONS.INVENTORY_MANAGE);

  return (
    <div className="space-y-4">
      <AppPageHeader title="inventory.title" />
      <InventoryFiltersBar filters={filters} onChange={setFilters} />
      <InventoryTable filters={filters} canManage={canManage} />
    </div>
  );
}

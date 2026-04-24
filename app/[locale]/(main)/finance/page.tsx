"use client";

import { useState } from "react";
import { Result } from "antd";
import dayjs from "dayjs";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import { useAuthRole } from "@/providers/AuthRoleProvider";
import { usePermission } from "@/common/hooks/usePermission";
import { PERMISSIONS } from "@/common/constants/permissions";
import PeriodSelector from "@/modules/finance/components/PeriodSelector";
import FinanceKpiCards from "@/modules/finance/components/FinanceKpiCards";
import ServiceExpenseBreakdown from "@/modules/finance/components/ServiceExpenseBreakdown";
import InventoryBreakdown from "@/modules/finance/components/InventoryBreakdown";
import { useFinanceSummary } from "@/modules/finance/hooks/useFinanceSummary";
import type { PeriodValue } from "@/modules/finance/components/PeriodSelector";

export default function FinancePage() {
  const { role } = useAuthRole();
  const { hasPermission } = usePermission(role);
  const currentMonth = dayjs().format("YYYY-MM");

  const [period, setPeriod] = useState<PeriodValue>({
    startMonth: currentMonth,
    endMonth: currentMonth,
  });

  const {
    isLoading,
    revenue,
    totalService,
    totalInventory,
    netProfit,
    serviceCategories,
    inventoryCategories,
  } = useFinanceSummary(period.startMonth, period.endMonth);

  if (!hasPermission(PERMISSIONS.FINANCE_VIEW)) {
    return <Result status="403" title="403" subTitle="You do not have permission to access this page." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <AppPageHeader title="finance.title" />
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <FinanceKpiCards
        revenue={revenue}
        totalService={totalService}
        totalInventory={totalInventory}
        netProfit={netProfit}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServiceExpenseBreakdown
          categories={serviceCategories}
          totalService={totalService}
          isLoading={isLoading}
        />
        <InventoryBreakdown
          categories={inventoryCategories}
          totalInventory={totalInventory}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

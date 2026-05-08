"use client";

import { useTranslations } from "next-intl";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import RatePlanTable from "@/modules/long-term/components/RatePlanTable";

export default function RatePlansPage() {
  const t = useTranslations();
  return (
    <div>
      <AppPageHeader translateTitle={false} title={t("longTerm.ratePlan.title")} />
      <RatePlanTable />
    </div>
  );
}

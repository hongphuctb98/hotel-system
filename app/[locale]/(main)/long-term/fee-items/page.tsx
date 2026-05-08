"use client";

import { useTranslations } from "next-intl";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import FeeItemTable from "@/modules/long-term/components/FeeItemTable";

export default function FeeItemsPage() {
  const t = useTranslations();
  return (
    <div>
      <AppPageHeader translateTitle={false} title={t("longTerm.feeItem.title")} />
      <FeeItemTable />
    </div>
  );
}

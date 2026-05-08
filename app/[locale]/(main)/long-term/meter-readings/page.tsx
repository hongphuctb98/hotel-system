"use client";

import { useTranslations } from "next-intl";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import MeterReadingTable from "@/modules/long-term/components/MeterReadingTable";

export default function MeterReadingsPage() {
  const t = useTranslations();
  return (
    <div>
      <AppPageHeader translateTitle={false} title={t("longTerm.meterReading.title")} />
      <MeterReadingTable />
    </div>
  );
}

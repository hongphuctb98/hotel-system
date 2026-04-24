"use client";

import { useTranslations } from "next-intl";
import PriceDisplay from "@/common/components/ui/PriceDisplay";

interface DocumentTotalFooterProps {
  total: number;
}

export default function DocumentTotalFooter({ total }: DocumentTotalFooterProps) {
  const t = useTranslations("expenses.lines");

  return (
    <div className="flex justify-between items-center border-t pt-3 mt-3">
      <span className="font-medium text-sm">{t("documentTotal")}</span>
      <PriceDisplay amount={total} isFallback={false} />
    </div>
  );
}

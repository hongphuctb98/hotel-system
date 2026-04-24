"use client";

import { Segmented, Tag } from "antd";
import { useTranslations } from "next-intl";
import type { ExpenseDocumentType } from "@/common/services/expenseDocumentService";

interface TypeSelectorProps {
  value: ExpenseDocumentType;
  onChange: (value: ExpenseDocumentType) => void;
  disabled?: boolean;
}

export default function TypeSelector({ value, onChange, disabled }: TypeSelectorProps) {
  const t = useTranslations("expenses.types");

  if (value === "INVENTORY_ADJUSTMENT") {
    return (
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-gray-500">{t("type")}:</span>
        <Tag color="orange">{t("INVENTORY_ADJUSTMENT")}</Tag>
      </div>
    );
  }

  const options = [
    { label: t("SERVICE"), value: "SERVICE" },
    { label: t("INVENTORY"), value: "INVENTORY" },
  ];

  return (
    <Segmented
      block
      options={options}
      value={value}
      onChange={(v) => onChange(v as ExpenseDocumentType)}
      disabled={disabled}
      className="mb-4"
    />
  );
}

"use client";

import { Select, DatePicker, Button } from "antd";
import { useTranslations } from "next-intl";
import { useMasterData } from "@/common/hooks/useMasterData";
import type { ExpenseDocumentType } from "@/common/services/expenseDocumentService";
import type { Dayjs } from "dayjs";

const { RangePicker } = DatePicker;

export type ExpenseFiltersState = {
  type?: ExpenseDocumentType;
  accountingMonthRange?: [Dayjs, Dayjs] | null;
  categoryId?: string;
};

interface ExpenseDocumentFiltersProps {
  filters: ExpenseFiltersState;
  onChange: (filters: ExpenseFiltersState) => void;
}

export default function ExpenseDocumentFilters({ filters, onChange }: ExpenseDocumentFiltersProps) {
  const t = useTranslations("expenses");
  const { expenseCategories } = useMasterData();

  const typeOptions = [
    { value: "", label: t("filters.allTypes") },
    { value: "SERVICE", label: t("types.SERVICE") },
    { value: "INVENTORY", label: t("types.INVENTORY") },
    { value: "INVENTORY_ADJUSTMENT", label: t("types.INVENTORY_ADJUSTMENT") },
  ];

  const categoryOptions = [
    { value: "", label: t("filters.category") },
    ...expenseCategories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const hasFilters = !!(filters.type || filters.accountingMonthRange || filters.categoryId);

  return (
    <div className="flex flex-wrap gap-2 mb-4 items-center">
      <Select
        style={{ width: 200 }}
        options={typeOptions}
        value={filters.type ?? ""}
        onChange={(v) => onChange({ ...filters, type: (v || undefined) as ExpenseDocumentType | undefined })}
      />
      <RangePicker
        picker="month"
        format="MM/YYYY"
        value={filters.accountingMonthRange ?? null}
        onChange={(v) => onChange({ ...filters, accountingMonthRange: v as [Dayjs, Dayjs] | null })}
      />
      {filters.type === "SERVICE" || !filters.type ? (
        <Select
          style={{ width: 200 }}
          options={categoryOptions}
          value={filters.categoryId ?? ""}
          onChange={(v) => onChange({ ...filters, categoryId: v || undefined })}
          placeholder={t("filters.category")}
        />
      ) : null}
      {hasFilters && (
        <Button onClick={() => onChange({})}>
          {t("filters.clearAll")}
        </Button>
      )}
    </div>
  );
}

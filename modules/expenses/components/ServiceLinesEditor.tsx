"use client";

import { Button, Select, InputNumber } from "antd";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useExpenseItems } from "../hooks/useExpenseItems";
import type { ExpenseItem } from "@/types/master.types";
import { formatNumberInput, parseNumberInput } from "@/common/utils/numberInput";

export type ServiceLine = {
  expenseItemId: string;
  amount: number;
};

interface ServiceLinesEditorProps {
  lines: ServiceLine[];
  onChange: (lines: ServiceLine[]) => void;
}

export default function ServiceLinesEditor({ lines, onChange }: ServiceLinesEditorProps) {
  const t = useTranslations("expenses.lines");
  const { data: itemsData } = useExpenseItems();
  const items = itemsData?.data ?? [];

  // Group items by category
  const grouped = items.reduce<Record<string, { label: string; items: ExpenseItem[] }>>((acc, item) => {
    const catId = item.categoryId;
    const catName = item.category?.name ?? t("other");
    if (!acc[catId]) acc[catId] = { label: catName, items: [] };
    acc[catId].items.push(item);
    return acc;
  }, {});

  const selectOptions = Object.values(grouped).map((g) => ({
    label: g.label,
    options: g.items.map((i) => ({ value: i.id, label: i.name })),
  }));

  const addLine = () =>
    onChange([...lines, { expenseItemId: "", amount: 0 }]);

  const removeLine = (index: number) =>
    onChange(lines.filter((_, i) => i !== index));

  const updateLine = (index: number, field: keyof ServiceLine, value: string | number) => {
    const updated = lines.map((l, i) => (i === index ? { ...l, [field]: value } : l));
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, index) => (
        <div key={index} className="grid grid-cols-12 gap-1 items-center">
          <Select
            className="col-span-7"
            options={selectOptions}
            value={line.expenseItemId || undefined}
            onChange={(v) => updateLine(index, "expenseItemId", v)}
            placeholder={t("item")}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
          <InputNumber
            className="col-span-4"
            value={line.amount || undefined}
            onChange={(v) => updateLine(index, "amount", v ?? 0)}
            style={{ width: "100%" }}
            placeholder={t("amount")}
            min={1}
            formatter={(value) => formatNumberInput(value, {})}
            parser={(value) => parseNumberInput(value) as 0}
          />
          <Button
            className="col-span-1"
            type="text"
            danger
            icon={<IconTrash size={14} />}
            onClick={() => removeLine(index)}
            disabled={lines.length <= 1}
          />
        </div>
      ))}
      <Button
        type="dashed"
        icon={<IconPlus size={14} />}
        onClick={addLine}
        className="mt-1"
      >
        {t("addLine")}
      </Button>
      {lines.length === 0 && (
        <span className="text-xs text-red-500">{t("minOneLine")}</span>
      )}
    </div>
  );
}

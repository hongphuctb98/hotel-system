"use client";

import { Button, Select, InputNumber } from "antd";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useMasterData } from "@/common/hooks/useMasterData";
import type { ExpenseDocumentType } from "@/common/services/expenseDocumentService";
import type { Product } from "@/types/master.types";
import { formatNumberInput, parseNumberInput } from "@/common/utils/numberInput";

export type InventoryLine = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

interface InventoryLinesEditorProps {
  lines: InventoryLine[];
  onChange: (lines: InventoryLine[]) => void;
  type: ExpenseDocumentType;
}

function formatVnd(amount: number) {
  return `${formatNumberInput(amount, {})} VND`;
}

export default function InventoryLinesEditor({ lines, onChange, type }: InventoryLinesEditorProps) {
  const t = useTranslations("expenses.lines");
  const { products, productCategories } = useMasterData();

  const grouped = productCategories.reduce<Record<string, { label: string; items: Product[] }>>((acc, cat) => {
    acc[cat.id] = { label: cat.name, items: [] };
    return acc;
  }, {});
  for (const p of products) {
    if (p.categoryId && grouped[p.categoryId]) {
      grouped[p.categoryId].items.push(p);
    }
  }

  const selectOptions = Object.values(grouped)
    .filter((g) => g.items.length > 0)
    .map((g) => ({
      label: g.label,
      options: g.items.map((p) => ({ value: p.id, label: `${p.name} (${p.unit})` })),
    }));

  const addLine = () =>
    onChange([...lines, { productId: "", quantity: 0, unitPrice: 0 }]);

  const removeLine = (index: number) =>
    onChange(lines.filter((_, i) => i !== index));

  const updateLine = (index: number, field: keyof InventoryLine, value: string | number) => {
    const updated = lines.map((l, i) => (i === index ? { ...l, [field]: value } : l));
    onChange(updated);
  };

  const isAdjustment = type === "INVENTORY_ADJUSTMENT";

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
        <div className="col-span-4">{t("product")}</div>
        <div className="col-span-2">{t("quantity")}</div>
        <div className="col-span-2">{t("unitPrice")}</div>
        <div className="col-span-3 text-right">{t("lineTotal")}</div>
      </div>
      {lines.map((line, index) => {
        const lineTotal = Math.round(line.quantity * line.unitPrice);
        const isNegative = lineTotal < 0;
        return (
          <div key={index} className="grid grid-cols-12 gap-1 items-center">
            <div className="col-span-4">
              <Select
               style={{ width: "100%" }}
                options={selectOptions}
                value={line.productId || undefined}
                onChange={(v) => updateLine(index, "productId", v)}
                placeholder={t("product")}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
              />
            </div>
            <div className="col-span-2">
              <InputNumber
                style={{ width: "100%" }}
                value={line.quantity || undefined}
                onChange={(v) => updateLine(index, "quantity", v ?? 0)}
                placeholder="0"
                min={isAdjustment ? undefined : 0.001}
                step={1}
              />
            </div>
            <div className="col-span-2 ">
              <InputNumber
                value={line.unitPrice || undefined}
                onChange={(v) => updateLine(index, "unitPrice", v ?? 0)}
                placeholder="0"
                min={0}
                style={{ width: "100%" }}
                formatter={(v) => formatNumberInput(v, {})}
                parser={(v) => parseNumberInput(v) as 0}
              />
            </div>
            <div className={`col-span-3 text-right text-sm ${isNegative ? "text-red-500" : "text-gray-700"}`}>
              {line.quantity && line.unitPrice ? formatVnd(lineTotal) : "—"}
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                type="text"
                danger
                size="small"
                icon={<IconTrash size={14} />}
                onClick={() => removeLine(index)}
                disabled={lines.length <= 1}
              />
            </div>
          </div>
        );
      })}
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

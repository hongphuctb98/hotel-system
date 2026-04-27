"use client";

import { Select, Switch, Input, Button, Space } from "antd";
import { useTranslations } from "next-intl";
import { useMasterData } from "@/common/hooks/useMasterData";
import type { InventoryFilters } from "@/common/services/inventoryService";

interface InventoryFiltersProps {
  filters: InventoryFilters;
  onChange: (filters: InventoryFilters) => void;
}

export default function InventoryFiltersBar({
  filters,
  onChange,
}: InventoryFiltersProps) {
  const t = useTranslations("inventory");
  const { productCategories } = useMasterData();

  const categoryOptions = [
    { value: "", label: t("filterCategory") },
    ...productCategories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const hasFilters = filters.categoryId || filters.lowStock || filters.search;

  return (
    <Space wrap className="mb-4">
      <Select
        value={filters.categoryId ?? ""}
        options={categoryOptions}
        onChange={(v) => onChange({ ...filters, categoryId: v || undefined })}
        style={{ width: 165 }}
      />

      <Input.Search
        value={filters.search ?? ""}
        placeholder={t("searchPlaceholder")}
        onChange={(e) =>
          onChange({ ...filters, search: e.target.value || undefined })
        }
        allowClear
        style={{ width: 240 }}
      />
      {hasFilters && (
        <Button onClick={() => onChange({})}>{t("clearFilters")}</Button>
      )}
      <Space size={8}>
        <Switch
          checked={!!filters.lowStock}
          size="small"
          onChange={(v) => onChange({ ...filters, lowStock: v || undefined })}
        />
        <span className="text-sm">{t("filterLowStock")}</span>
      </Space>
    </Space>
  );
}

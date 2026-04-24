"use client";

import { Tag } from "antd";
import { useTranslations } from "next-intl";

interface LowStockBadgeProps {
  quantity: number;
  reorderLevel: number;
}

export default function LowStockBadge({ quantity, reorderLevel }: LowStockBadgeProps) {
  const t = useTranslations("inventory");
  if (reorderLevel <= 0 || quantity >= reorderLevel) return null;
  return <Tag color="error">{t("lowStock")}</Tag>;
}

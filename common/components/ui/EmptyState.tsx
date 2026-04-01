"use client";

import { Empty } from "antd";
import { useTranslations } from "next-intl";

export default function EmptyState() {
  const t = useTranslations();
  return <Empty description={t("common.noData")} />;
}

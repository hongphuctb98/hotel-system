"use client";

import { Card, Skeleton, Typography } from "antd";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { ROUTES } from "@/common/constants/routes";

export default function HousekeepingSummary() {
  const t = useTranslations();
  const locale = useLocale();
  const { data, isLoading } = useDashboardStats();
  const counts = data?.data?.housekeepingCounts;

  const items = [
    { label: t("dashboard.pending"), value: counts?.pending ?? 0, color: "#fa8c16" },
    { label: t("dashboard.inProgress"), value: counts?.inProgress ?? 0, color: "#1677ff" },
    { label: t("dashboard.completedToday"), value: counts?.completedToday ?? 0, color: "#52c41a" },
  ];

  return (
    <Card
      variant="borderless"
      title={t("dashboard.housekeeping")}
      extra={
        <Link
          href={`/${locale}${ROUTES.HOUSEKEEPING}`}
          style={{ fontSize: 13, color: "var(--ant-color-primary)" }}
        >
          {t("dashboard.viewAll")}
        </Link>
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <Typography.Title
                level={3}
                style={{ color: item.color, margin: 0, fontWeight: 700 }}
              >
                {item.value}
              </Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {item.label}
              </Typography.Text>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

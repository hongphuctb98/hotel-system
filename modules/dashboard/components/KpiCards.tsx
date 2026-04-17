"use client";

import {
  IconCurrencyDollar,
  IconBed,
  IconLogin,
  IconLogout,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import AppStatisticCard from "@/common/components/ui/AppStatisticCard";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";

export default function KpiCards() {
  const { data, isLoading } = useDashboardStats();
  const stats = data?.data;
  const { format } = useLocaleCurrency();
  const t = useTranslations("dashboard");

  const todayExpected = stats?.todayExpectedRevenue ?? 0;

  const cards = [
    {
      title: "dashboard.revenue",
      value: format(stats?.periodRevenue ?? 0),
      icon: <IconCurrencyDollar size={22} />,
      color: "#52c41a",
      secondaryText: todayExpected > 0
        ? `${t("scheduledToday")}: ${format(todayExpected)}`
        : undefined,
    },
    {
      title: "dashboard.occupancyRate",
      value: stats?.occupancyRate ?? 0,
      suffix: "%",
      icon: <IconBed size={22} />,
      color: "#1677ff",
    },
    {
      title: "dashboard.todayCheckinCount",
      value: stats?.todayCheckinCount ?? 0,
      icon: <IconLogin size={22} />,
      color: "#722ed1",
    },
    {
      title: "dashboard.todayCheckouts",
      value: stats?.todayCheckoutsCount ?? 0,
      icon: <IconLogout size={22} />,
      color: "#fa8c16",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <AppStatisticCard key={card.title} {...card} loading={isLoading} />
      ))}
    </div>
  );
}

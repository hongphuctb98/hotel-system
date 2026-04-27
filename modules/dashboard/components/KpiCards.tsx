"use client";

import {
  IconCurrencyDollar,
  IconBed,
  IconLogin,
  IconLogout,
} from "@tabler/icons-react";
import AppStatisticCard from "@/common/components/ui/AppStatisticCard";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";

export default function KpiCards() {
  const { data, isLoading } = useDashboardStats();
  const stats = data?.data;
  const { format } = useLocaleCurrency();

  const todayCollected = stats?.todayCollected ?? 0;
  const yesterdayCollected = stats?.yesterdayCollected ?? 0;

  // Day-over-day delta
  const revenueDelta = todayCollected - yesterdayCollected;
  const revenueDeltaPercent =
    yesterdayCollected > 0
      ? Math.round((revenueDelta / yesterdayCollected) * 100)
      : null;
  const revenueDeltaFormatted =
    revenueDelta === 0
      ? undefined
      : `${revenueDelta > 0 ? "+" : ""}${format(Math.abs(revenueDelta))}`;

  const cards = [
    {
      title: "dashboard.revenue",
      value: format(todayCollected),
      icon: <IconCurrencyDollar size={22} />,
      color: "#52c41a",
      changeAmount: revenueDeltaFormatted,
      changePercent: revenueDeltaPercent,
    },
    {
      title: "dashboard.occupancyRate",
      value: stats?.occupancyRate ?? 0,
      suffix: "%",
      icon: <IconBed size={22} />,
      color: "#1677ff",
      changePercent: stats?.occupancyRateChange,
    },
    {
      title: "dashboard.todayCheckinCount",
      value: stats?.todayCheckinCount ?? 0,
      icon: <IconLogin size={22} />,
      color: "#722ed1",
      changePercent: stats?.todayCheckinChange,
    },
    {
      title: "dashboard.todayCheckouts",
      value: stats?.todayCheckoutsCount ?? 0,
      icon: <IconLogout size={22} />,
      color: "#fa8c16",
      changePercent: stats?.todayCheckoutsChange,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <AppStatisticCard key={card.title} {...card} loading={isLoading} />
      ))}
    </div>
  );
}

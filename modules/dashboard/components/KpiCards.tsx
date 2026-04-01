"use client";

import {
  IconCurrencyDollar,
  IconBed,
  IconUsers,
  IconVacuumCleaner,
} from "@tabler/icons-react";
import AppStatisticCard from "@/common/components/ui/AppStatisticCard";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";

export default function KpiCards() {
  const { data, isLoading } = useDashboardStats();
  const stats = data?.data;
  const { format } = useLocaleCurrency();

  const cards = [
    {
      title: "dashboard.revenue",
      value: format(stats?.todayRevenue ?? 0),
      icon: <IconCurrencyDollar size={22} />,
      color: "#52c41a",
    },
    {
      title: "dashboard.occupancyRate",
      value: stats?.occupancyRate ?? 0,
      suffix: "%",
      icon: <IconBed size={22} />,
      color: "#1677ff",
    },
    {
      title: "dashboard.currentGuests",
      value: stats?.currentGuests ?? 0,
      icon: <IconUsers size={22} />,
      color: "#722ed1",
    },
    {
      title: "dashboard.needsCleaning",
      value: stats?.roomsNeedCleaning ?? 0,
      icon: <IconVacuumCleaner size={22} />,
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

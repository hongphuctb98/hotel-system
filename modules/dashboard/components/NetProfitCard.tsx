"use client";

import dayjs from "dayjs";
import { useAuthRole } from "@/providers/AuthRoleProvider";
import AppStatisticCard from "@/common/components/ui/AppStatisticCard";
import { useFinanceSummary } from "@/modules/finance/hooks/useFinanceSummary";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";

export default function NetProfitCard() {
  const { role } = useAuthRole();

  if (role !== "ADMIN" && role !== "MANAGER") return null;

  return <NetProfitCardInner />;
}

function NetProfitCardInner() {
  const currentMonth = dayjs().format("YYYY-MM");
  const { netProfit, isLoading } = useFinanceSummary(currentMonth, currentMonth);
  const { format } = useLocaleCurrency();

  return (
    <AppStatisticCard
      title="finance.netProfitCard"
      value={format(Math.abs(netProfit))}
      color={netProfit >= 0 ? "#52c41a" : "#ff4d4f"}
      loading={isLoading}
    />
  );
}

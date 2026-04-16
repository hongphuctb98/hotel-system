"use client";

import { useState } from "react";
import { Card, Segmented, Skeleton } from "antd";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";

const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

export default function RevenueChart() {
  const t = useTranslations();
  const [period, setPeriod] = useState<"7d" | "30d">("7d");
  const { data, isLoading } = useDashboardStats(period);
  const { format } = useLocaleCurrency();
  const stats = data?.data;

  const chartData = (stats?.revenueByDay ?? []).map((d) => ({
    date: dayjs(d.date).format("MMM D"),
    revenue: d.revenue,
    rawDate: d.date,
  }));

  return (
    <Card
      variant="borderless"
      title={t("dashboard.revenueChart")}
      extra={
        <Segmented
          size="small"
          value={period}
          onChange={(v) => setPeriod(v as "7d" | "30d")}
          options={[
            { label: t("dashboard.period7d"), value: "7d" },
            { label: t("dashboard.period30d"), value: "30d" },
          ]}
        />
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={period === "30d" ? 4 : 0}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                width={48}
              />
              <Tooltip
                formatter={(value) => [format(Number(value ?? 0)), t("dashboard.revenue")]}
                labelStyle={{ fontWeight: 600 }}
                cursor={{ fill: "rgba(22,119,255,0.06)" }}
              />
              <Bar dataKey="revenue" fill="#1677ff" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

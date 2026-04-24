"use client";

import { Card, Skeleton, Typography } from "antd";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useDashboardCharts } from "../hooks/useDashboardCharts";

const AreaChart        = dynamic(() => import("recharts").then((m) => m.AreaChart),        { ssr: false });
const Area             = dynamic(() => import("recharts").then((m) => m.Area),             { ssr: false });
const XAxis            = dynamic(() => import("recharts").then((m) => m.XAxis),            { ssr: false });
const YAxis            = dynamic(() => import("recharts").then((m) => m.YAxis),            { ssr: false });
const Tooltip          = dynamic(() => import("recharts").then((m) => m.Tooltip),          { ssr: false });
const ReferenceLine    = dynamic(() => import("recharts").then((m) => m.ReferenceLine),    { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

const TARGET = 80;

export default function OccupancyTrend() {
  const t = useTranslations("dashboard");
  const { data, isLoading } = useDashboardCharts();
  const chartData = data?.data?.occupancyByWeek ?? [];

  return (
    <Card
      variant="outlined"
      styles={{ body: { padding: 16} }}
      style={{ borderRadius: 12, borderWidth: "0.5px" }}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{t("occupancyTrend")}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            {t("occupancyTrendSubtitle")}
          </Typography.Text>
        </div>
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <div style={{ width: "100%", height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#378ADD" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#378ADD" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                width={34}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, t("occupancyRate")]}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <ReferenceLine
                y={TARGET}
                stroke="#fa8c16"
                strokeDasharray="5 3"
                label={{
                  value: t("occupancyTarget"),
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "#fa8c16",
                }}
              />
              <Area
                type="monotone"
                dataKey="occupancyRate"
                stroke="#378ADD"
                strokeWidth={2}
                fill="url(#occupancyGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#378ADD" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

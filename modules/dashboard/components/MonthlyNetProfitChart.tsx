"use client";

import { Card, Skeleton, Typography } from "antd";
import dynamic from "next/dynamic";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useAuthRole } from "@/providers/AuthRoleProvider";
import { useDashboardCharts } from "../hooks/useDashboardCharts";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";

const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

export default function MonthlyNetProfitChart() {
  const { role } = useAuthRole();
  if (role !== "ADMIN" && role !== "MANAGER") return null;
  return <MonthlyNetProfitChartInner />;
}

function MonthlyNetProfitChartInner() {
  const t = useTranslations("dashboard");
  const { data, isLoading } = useDashboardCharts();
  const { format } = useLocaleCurrency();
  const raw = data?.data?.monthlyRevenueVsExpense ?? [];

  const chartData = raw.map((d) => ({
    label: dayjs(d.date).format("MMM D"),
    revenue: d.revenue,
    expense: d.expense,
  }));

  const formatYAxis = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);

  return (
    <Card
      variant="outlined"
      styles={{ body: { padding: 16 } }}
      style={{ borderRadius: 12, borderWidth: "0.5px", height: "100%" }}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{t("monthlyProfitChart")}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            {dayjs().format("MMMM YYYY")}
          </Typography.Text>
        </div>
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -4, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatYAxis}
                  width={44}
                />
                <Tooltip
                  formatter={(value, name) => [
                    format(Number(value ?? 0)),
                    name === "revenue" ? t("revenueSeries") : t("expenseSeries"),
                  ]}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="revenue"
                  stroke="#1677ff"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="expense"
                  stroke="#ff7a45"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-1.5">
              <span style={{ display: "inline-block", width: 20, height: 0, borderTop: "2px solid #1677ff" }} />
              <Typography.Text style={{ fontSize: 12 }}>{t("revenueSeries")}</Typography.Text>
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ display: "inline-block", width: 20, height: 0, borderTop: "2px dashed #ff7a45" }} />
              <Typography.Text style={{ fontSize: 12 }}>{t("expenseSeries")}</Typography.Text>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

"use client";

import { Card, Skeleton, Typography } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { Bar, Cell, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDashboardCharts } from "../hooks/useDashboardCharts";

const BAR_COLOR         = "#378ADD";
const BAR_COLOR_TODAY   = "#1d4ed8"; // darker blue for today
const AVG_LINE_COLOR    = "#94a3b8";

export default function DailyNewBookings() {
  const t = useTranslations("dashboard");
  const { data, isLoading } = useDashboardCharts();
  const raw = data?.data?.dailyNewBookings ?? [];

  const todayStr = dayjs().format("YYYY-MM-DD");

  const chartData = raw.map((d) => ({
    label: dayjs(d.date).format("MMM D"),
    count: d.count,
    isToday: d.date === todayStr,
  }));

  const average =
    chartData.length > 0
      ? Math.round((chartData.reduce((s, d) => s + d.count, 0) / chartData.length) * 10) / 10
      : 0;

  return (
    <Card
      variant="outlined"
      styles={{ body: { padding: 16 } }}
      style={{ borderRadius: 12, borderWidth: "0.5px" }}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{t("dailyNewBookings")}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            {t("dailyNewBookingsSubtitle")}
          </Typography.Text>
        </div>
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <div style={{ width: "100%", height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={30}
              />
              <Tooltip
                formatter={(value) => [value, t("bookingsSeries")]}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                labelStyle={{ fontWeight: 600 }}
              />
              {average > 0 && (
                <ReferenceLine
                  y={average}
                  stroke={AVG_LINE_COLOR}
                  strokeDasharray="4 3"
                  label={{
                    value: t("dailyAvg"),
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: AVG_LINE_COLOR,
                  }}
                />
              )}
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={14}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.isToday ? BAR_COLOR_TODAY : BAR_COLOR}
                    fillOpacity={entry.isToday ? 1 : 0.72}
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

"use client";

import { Card, Empty, Skeleton, Typography } from "antd";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useDashboardCharts } from "../hooks/useDashboardCharts";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";

const BarChart         = dynamic(() => import("recharts").then((m) => m.BarChart),         { ssr: false });
const Bar              = dynamic(() => import("recharts").then((m) => m.Bar),              { ssr: false });
const XAxis            = dynamic(() => import("recharts").then((m) => m.XAxis),            { ssr: false });
const YAxis            = dynamic(() => import("recharts").then((m) => m.YAxis),            { ssr: false });
const Tooltip          = dynamic(() => import("recharts").then((m) => m.Tooltip),          { ssr: false });
const CartesianGrid    = dynamic(() => import("recharts").then((m) => m.CartesianGrid),    { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

export default function RoomTypeRevenueChart() {
  const t = useTranslations("dashboard");
  const { data, isLoading } = useDashboardCharts();
  const { format } = useLocaleCurrency();
  const chartData = data?.data?.revenueAndBookingsByRoomType ?? [];

  const hasData = chartData.some((d) => d.revenue > 0 || d.bookings > 0);

  return (
    <Card
      variant="outlined"
      styles={{ body: { padding: 16 } }}
      style={{ borderRadius: 12, borderWidth: "0.5px" }}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{t("revenueByRoomType")}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            {t("revenueByRoomTypeSubtitle")}
          </Typography.Text>
        </div>
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : !hasData ? (
        <div className="flex items-center justify-center h-40">
          <Empty description={t("noData")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="roomType"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <YAxis
                yAxisId="revenue"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
                width={44}
              />
              <YAxis
                yAxisId="bookings"
                orientation="right"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={30}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                formatter={(value, name) =>
                  name === t("revenueSeries")
                    ? [format(Number(value)), name]
                    : [value, name]
                }
              />
              <Bar
                yAxisId="revenue"
                dataKey="revenue"
                name={t("revenueSeries")}
                fill="#378ADD"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
              <Bar
                yAxisId="bookings"
                dataKey="bookings"
                name={t("bookingsSeries")}
                fill="#52c41a"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Legend */}
      {!isLoading && hasData && (
        <div className="flex justify-center gap-6 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#378ADD]" />
            <Typography.Text style={{ fontSize: 12 }}>{t("revenueSeries")}</Typography.Text>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#52c41a]" />
            <Typography.Text style={{ fontSize: 12 }}>{t("bookingsSeries")}</Typography.Text>
          </div>
        </div>
      )}
    </Card>
  );
}

"use client";

import { Card, Skeleton, Typography } from "antd";
import dynamic from "next/dynamic";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useDashboardCharts } from "../hooks/useDashboardCharts";

const LineChart        = dynamic(() => import("recharts").then((m) => m.LineChart),        { ssr: false });
const Line             = dynamic(() => import("recharts").then((m) => m.Line),             { ssr: false });
const XAxis            = dynamic(() => import("recharts").then((m) => m.XAxis),            { ssr: false });
const YAxis            = dynamic(() => import("recharts").then((m) => m.YAxis),            { ssr: false });
const Tooltip          = dynamic(() => import("recharts").then((m) => m.Tooltip),          { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

export default function CheckinCheckoutTrend() {
  const t = useTranslations("dashboard");
  const { data, isLoading } = useDashboardCharts();
  const raw = data?.data?.checkinCheckoutByDay ?? [];

  const chartData = raw.map((d) => ({
    label: dayjs(d.date).format("MMM D"),
    checkins: d.checkins,
    checkouts: d.checkouts,
  }));

  return (
    <Card
      variant="outlined"
      styles={{ body: { padding: 16 } }}
      style={{ borderRadius: 12, borderWidth: "0.5px", height: "100%" }}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{t("checkinCheckoutTrend")}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            {t("checkinCheckoutSubtitle")}
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
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
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
                />
                <Tooltip
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="checkins"
                  name={t("checkinSeries")}
                  stroke="#52c41a"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="checkouts"
                  name={t("checkoutSeries")}
                  stroke="#f5222d"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Custom legend */}
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-1.5">
              <span
                style={{ display: "inline-block", width: 20, height: 0, borderTop: "2px solid #52c41a" }}
              />
              <Typography.Text style={{ fontSize: 12 }}>{t("checkinSeries")}</Typography.Text>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                style={{ display: "inline-block", width: 20, height: 0, borderTop: "2px dashed #f5222d" }}
              />
              <Typography.Text style={{ fontSize: 12 }}>{t("checkoutSeries")}</Typography.Text>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

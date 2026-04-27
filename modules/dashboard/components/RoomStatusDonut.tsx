"use client";

import dynamic from "next/dynamic";
import { Card, Skeleton, Typography } from "antd";
import { useTranslations } from "next-intl";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false },
);
import { useDashboardStats } from "../hooks/useDashboardStats";

export default function RoomStatusDonut() {
  const t = useTranslations("dashboard");
  const { data, isLoading } = useDashboardStats();
  const stats = data?.data;
  const counts = stats?.roomStatusCounts ?? [];
  const totalRooms = stats?.totalRooms ?? counts.reduce((s, c) => s + c.count, 0);

  const pieData = counts.filter((c) => c.count > 0);

  return (
    <Card
      variant="outlined"
      styles={{ body: { padding: 16 } }}
      style={{ borderRadius: 12, borderWidth: "0.5px" }}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{t("roomStatus")}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            {t("roomStatusSubtitle")}
          </Typography.Text>
        </div>
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <>
          {/* Donut with absolute center label */}
          <div className="relative" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.code} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{totalRooms}</span>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                {t("totalActiveRooms")}
              </Typography.Text>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 space-y-1.5">
            {counts.map((s) => (
              <div key={s.code} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <Typography.Text style={{ fontSize: 12 }}>{s.name}</Typography.Text>
                </div>
                <Typography.Text strong style={{ fontSize: 12 }}>
                  {s.count}
                </Typography.Text>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

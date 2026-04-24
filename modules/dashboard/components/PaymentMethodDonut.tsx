"use client";

import { Card, Empty, Skeleton, Typography } from "antd";
import { useTranslations } from "next-intl";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useDashboardCharts } from "../hooks/useDashboardCharts";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";

export default function PaymentMethodDonut() {
  const t = useTranslations("dashboard");
  const { data, isLoading } = useDashboardCharts();
  const { format } = useLocaleCurrency();
  const breakdown = data?.data?.paymentMethodBreakdown ?? [];

  const total = breakdown.reduce((s, m) => s + m.amount, 0);
  const hasData = breakdown.length > 0 && total > 0;

  return (
    <Card
      variant="outlined"
      styles={{ body: { padding: 16 } }}
      style={{ borderRadius: 12, borderWidth: "0.5px" }}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{t("paymentMethods")}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            {t("paymentMethodsSubtitle")}
          </Typography.Text>
        </div>
      }
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : !hasData ? (
        <div className="flex items-center justify-center h-40">
          <Empty description={t("paymentMethodsEmpty")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <>
          <div className="relative" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdown}
                  dataKey="amount"
                  nameKey="methodName"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {breakdown.map((entry) => (
                    <Cell key={entry.methodCode} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [format(Number(value)), name]}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend with percentage */}
          <div className="mt-3 space-y-1.5">
            {breakdown.map((m) => {
              const pct = total > 0 ? Math.round((m.amount / total) * 100) : 0;
              return (
                <div key={m.methodName} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: m.color }}
                    />
                    <Typography.Text style={{ fontSize: 12 }}>{m.methodName}</Typography.Text>
                  </div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {pct}%
                  </Typography.Text>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}

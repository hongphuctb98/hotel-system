"use client";

import { Card, Statistic, Skeleton } from "antd";
import { useTranslations } from "next-intl";

interface AppStatisticCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  loading?: boolean;
  suffix?: string;
}

export default function AppStatisticCard({
  title,
  value,
  icon,
  color = "#1677ff",
  loading = false,
  suffix,
}: AppStatisticCardProps) {
  const t = useTranslations();

  return (
    <Card variant="borderless" style={{ borderRadius: 12 }}>
      {loading ? (
        <Skeleton active paragraph={{ rows: 1 }} />
      ) : (
        <div className="flex items-start justify-between">
          <Statistic
            title={t(title)}
            value={value}
            suffix={suffix}
            styles={{
              content: {
                color,
                fontSize: 24,
                fontWeight: 700,
              },
            }}
          />
          {icon && (
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl"
              style={{ backgroundColor: `${color}18` }}
            >
              <span style={{ color }}>{icon}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

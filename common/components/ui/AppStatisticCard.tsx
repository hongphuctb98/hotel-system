"use client";

import { Card, Statistic, Skeleton } from "antd";
import { useTranslations } from "next-intl";
import { IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react";

interface AppStatisticCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  loading?: boolean;
  suffix?: string;
  secondaryText?: string;
  changePercent?: number | null;
}

export default function AppStatisticCard({
  title,
  value,
  icon,
  color = "#1677ff",
  loading = false,
  suffix,
  secondaryText,
  changePercent,
}: AppStatisticCardProps) {
  const t = useTranslations();

  const changeColor =
    changePercent == null ? "#8c8c8c" : changePercent > 0 ? "#52c41a" : changePercent < 0 ? "#ff4d4f" : "#8c8c8c";
  const ChangeIcon =
    changePercent == null || changePercent === 0
      ? IconMinus
      : changePercent > 0
        ? IconTrendingUp
        : IconTrendingDown;

  return (
    <Card variant="borderless" style={{ borderRadius: 12 }}>
      {loading ? (
        <Skeleton active paragraph={{ rows: 1 }} />
      ) : (
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1 min-w-0">
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
            {secondaryText && (
              <span className="text-xs" style={{ color: "#8c8c8c" }}>
                {secondaryText}
              </span>
            )}
            {changePercent !== undefined && (
              <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color: changeColor }}>
                <ChangeIcon size={13} />
                {changePercent == null ? "—" : `${changePercent > 0 ? "+" : ""}${changePercent}%`}
              </span>
            )}
          </div>
          {icon && (
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
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

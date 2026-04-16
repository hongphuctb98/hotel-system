"use client";

import { Typography } from "antd";
import { useTranslations } from "next-intl";

interface AppPageHeaderProps {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
  translateTitle?: boolean;
}

export default function AppPageHeader({
  title,
  subtitle,
  extra,
  translateTitle = true,
}: AppPageHeaderProps) {
  const t = useTranslations();
  const displayTitle = translateTitle ? t(title) : title;

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
         {displayTitle}
        </Typography.Title>
        {subtitle && (
          <Typography.Text type="secondary" className="text-sm">
            {subtitle}
          </Typography.Text>
        )}
      </div>
      {extra && <div className="flex gap-2">{extra}</div>}
    </div>
  );
}

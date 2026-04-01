"use client";

import { Card } from "antd";
import type { CardProps } from "antd";

interface AppCardProps extends CardProps {
  children: React.ReactNode;
}

export default function AppCard({ children, ...props }: AppCardProps) {
  return (
    <Card variant="borderless" {...props}>
      {children}
    </Card>
  );
}

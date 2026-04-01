"use client";

import { Tag } from "antd";

interface StatusBadgeProps {
  color: string;
  label: string;
}

export default function StatusBadge({ color, label }: StatusBadgeProps) {
  return (
    <Tag
      color={color}
      style={{ borderRadius: 20, fontSize: 12, padding: "1px 10px" }}
    >
      {label}
    </Tag>
  );
}

"use client";

import { Spin } from "antd";

export default function LoadingOverlay() {
  return (
    <div className="flex items-center justify-center w-full h-64">
      <Spin size="large" />
    </div>
  );
}

"use client";

import { Tabs } from "antd";
import { useTranslations } from "next-intl";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import TaskList from "@/modules/housekeeping/components/TaskList";

export default function HousekeepingPage() {
  const t = useTranslations();

  return (
    <div className="space-y-4">
      <AppPageHeader title="housekeeping.title" />
      <Tabs
        items={[
          {
            key: "PENDING",
            label: t("housekeeping.pending"),
            children: <TaskList status="PENDING" />,
          },
          {
            key: "IN_PROGRESS",
            label: t("housekeeping.inProgress"),
            children: <TaskList status="IN_PROGRESS" />,
          },
          {
            key: "DONE",
            label: t("housekeeping.done"),
            children: <TaskList status="DONE" />,
          },
        ]}
      />
    </div>
  );
}

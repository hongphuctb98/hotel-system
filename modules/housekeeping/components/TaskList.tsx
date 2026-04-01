"use client";

import { Card, Button, Tag, Typography } from "antd";
import { IconCheck, IconLoader } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useHousekeeping } from "../hooks/useHousekeeping";
import LoadingOverlay from "@/common/components/ui/LoadingOverlay";
import EmptyState from "@/common/components/ui/EmptyState";

const STATUS_NEXT: Record<string, string> = {
  PENDING: "IN_PROGRESS",
  IN_PROGRESS: "DONE",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "orange",
  IN_PROGRESS: "blue",
  DONE: "green",
};

export default function TaskList({ status }: { status: string }) {
  const t = useTranslations();
  const { tasks, isLoading, updateStatus } = useHousekeeping(status);

  if (isLoading) return <LoadingOverlay />;
  if (!tasks.length) return <EmptyState />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.map((task) => (
        <Card key={task.id} size="small" variant="borderless" className="shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <Typography.Text strong>
                {t("room.number")} {task.room?.number ?? task.roomId}
              </Typography.Text>
              <Typography.Text type="secondary" className="block text-xs">
                {task.room?.floor?.name}
              </Typography.Text>
            </div>
            <Tag color={STATUS_COLOR[task.status]}>{task.status}</Tag>
          </div>
          <div className="mt-2 text-sm">
            <Tag>{task.type}</Tag>
            {task.assignedTo && (
              <Typography.Text type="secondary" className="ml-2 text-xs">
                {task.assignedTo}
              </Typography.Text>
            )}
          </div>
          {task.note && (
            <Typography.Text type="secondary" className="text-xs mt-1 block">
              {task.note}
            </Typography.Text>
          )}
          {STATUS_NEXT[task.status] && (
            <div className="mt-3">
              <Button
                size="small"
                type="primary"
                icon={
                  STATUS_NEXT[task.status] === "IN_PROGRESS" ? (
                    <IconLoader size={12} />
                  ) : (
                    <IconCheck size={12} />
                  )
                }
                loading={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({ id: task.id, status: STATUS_NEXT[task.status] })
                }
              >
                {STATUS_NEXT[task.status] === "IN_PROGRESS"
                  ? t("housekeeping.inProgress")
                  : t("housekeeping.done")}
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

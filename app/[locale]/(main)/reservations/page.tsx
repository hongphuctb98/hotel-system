"use client";

import { Button, Tabs } from "antd";
import { IconPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import ReservationTable from "@/modules/reservations/components/ReservationTable";
import { useDisclosure } from "@/common/hooks/useDisclosure";

export default function ReservationsPage() {
  const t = useTranslations();
  const modal = useDisclosure();

  return (
    <div className="space-y-4">
      <AppPageHeader
        title="nav.reservations"
        extra={
          <Button type="primary" icon={<IconPlus size={16} />} onClick={modal.open}>
            {t("booking.create")}
          </Button>
        }
      />
      <Tabs
        items={[
          {
            key: "table",
            label: t("booking.tableView"),
            children: <ReservationTable />,
          },
          {
            key: "timeline",
            label: t("booking.timelineView"),
            children: (
              <div className="bg-white rounded-xl border border-gray-100 p-6 h-64 flex items-center justify-center text-gray-400">
                Timeline/Gantt View — integrate with a timeline library
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

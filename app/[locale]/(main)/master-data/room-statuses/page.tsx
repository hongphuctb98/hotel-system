"use client";

import MasterDataTable from "@/modules/master-data/components/MasterDataTable";
import RoomStatusForm from "@/modules/master-data/forms/RoomStatusForm";
import StatusBadge from "@/common/components/ui/StatusBadge";
import type { MasterDataConfig, RoomStatus } from "@/types/master.types";

const config: MasterDataConfig<RoomStatus> = {
  endpoint: "/api/master/room-statuses",
  titleKey: "nav.masterData.roomStatuses",
  columns: [
    { key: "code", dataIndex: "code", title: "Code", width: 120 },
    { key: "name", dataIndex: "name", title: "Name" },
    {
      key: "color",
      title: "Color / Label",
      render: (_: unknown, r: RoomStatus) => (
        <StatusBadge color={r.color} label={r.name} />
      ),
      width: 160,
    },
    {
      key: "isSellable",
      dataIndex: "isSellable",
      title: "Sellable",
      render: (v: boolean) => (v ? "Yes" : "No"),
      width: 90,
    },
  ],
  FormComponent: RoomStatusForm,
};

export default function RoomStatusesPage() {
  return <MasterDataTable config={config} />;
}

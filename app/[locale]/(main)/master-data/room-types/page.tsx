"use client";

import MasterDataTable from "@/modules/master-data/components/MasterDataTable";
import RoomTypeForm from "@/modules/master-data/forms/RoomTypeForm";
import type { MasterDataConfig, RoomType } from "@/types/master.types";

const config: MasterDataConfig<RoomType> = {
  endpoint: "/api/master/room-types",
  titleKey: "nav.masterData.roomTypes",
  columns: [
    { key: "code", dataIndex: "code", title: "Code", width: 100 },
    { key: "name", dataIndex: "name", title: "Name" },
    { key: "capacity", dataIndex: "capacity", title: "Capacity", width: 90 },
    {
      key: "description",
      dataIndex: "description",
      title: "Description",
      render: (v: string | null) => v ?? "—",
    },
  ],
  FormComponent: RoomTypeForm,
};

export default function RoomTypesPage() {
  return <MasterDataTable config={config} />;
}

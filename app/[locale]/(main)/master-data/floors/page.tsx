"use client";

import MasterDataTable from "@/modules/master-data/components/MasterDataTable";
import FloorForm from "@/modules/master-data/forms/FloorForm";
import type { MasterDataConfig } from "@/types/master.types";
import type { Floor } from "@/types/master.types";

const config: MasterDataConfig<Floor> = {
  endpoint: "/api/master/floors",
  titleKey: "nav.masterData.floors",
  columns: [
    { key: "code", dataIndex: "code", title: "Code", width: 100 },
    { key: "name", dataIndex: "name", title: "Name" },
    { key: "displayOrder", dataIndex: "displayOrder", title: "Order", width: 80 },
    { key: "note", dataIndex: "note", title: "Note", render: (v) => v ?? "—" },
  ],
  FormComponent: FloorForm,
};

export default function FloorsPage() {
  return <MasterDataTable config={config} />;
}

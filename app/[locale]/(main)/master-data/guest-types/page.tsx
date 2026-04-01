"use client";

import MasterDataTable from "@/modules/master-data/components/MasterDataTable";
import SimpleCodeNameForm from "@/modules/master-data/forms/SimpleCodeNameForm";
import StatusBadge from "@/common/components/ui/StatusBadge";
import type { MasterDataConfig, GuestType } from "@/types/master.types";

const FormWithColor = (props: Parameters<typeof SimpleCodeNameForm>[0]) => (
  <SimpleCodeNameForm {...props} showColor />
);

const config: MasterDataConfig<GuestType> = {
  endpoint: "/api/master/guest-types",
  titleKey: "nav.masterData.guestTypes",
  columns: [
    { key: "code", dataIndex: "code", title: "Code", width: 120 },
    { key: "name", dataIndex: "name", title: "Name" },
    {
      key: "color",
      title: "Label",
      render: (_: unknown, r: GuestType) => (
        <StatusBadge color={r.color} label={r.name} />
      ),
      width: 140,
    },
  ],
  FormComponent: FormWithColor,
};

export default function GuestTypesPage() {
  return <MasterDataTable config={config} />;
}

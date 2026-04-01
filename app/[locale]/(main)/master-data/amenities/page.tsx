import MasterDataTable from "@/modules/master-data/components/MasterDataTable";
import SimpleCodeNameForm from "@/modules/master-data/forms/SimpleCodeNameForm";
import type { MasterDataConfig, Amenity } from "@/types/master.types";

const config: MasterDataConfig<Amenity> = {
  endpoint: "/api/master/amenities",
  titleKey: "nav.masterData.amenities",
  columns: [
    { key: "code", dataIndex: "code", title: "Code", width: 120 },
    { key: "name", dataIndex: "name", title: "Name" },
    { key: "icon", dataIndex: "icon", title: "Icon", width: 80, render: (v) => v ?? "—" },
  ],
  FormComponent: SimpleCodeNameForm,
};

export default function AmenitiesPage() {
  return <MasterDataTable config={config} />;
}

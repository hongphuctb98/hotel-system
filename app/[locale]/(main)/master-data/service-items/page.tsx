import MasterDataTable from "@/modules/master-data/components/MasterDataTable";
import type { MasterDataConfig, ServiceItem } from "@/types/master.types";
import ServiceItemForm from "@/modules/master-data/forms/ServiceItemForm";

const config: MasterDataConfig<ServiceItem> = {
  endpoint: "/api/master/service-items",
  titleKey: "nav.masterData.serviceItems",
  columns: [
    { key: "code", dataIndex: "code", title: "Code", width: 120 },
    { key: "name", dataIndex: "name", title: "Name" },
    {
      key: "unitPrice",
      dataIndex: "unitPrice",
      title: "Unit Price",
      width: 140,
      render: (v: number) => v?.toLocaleString() ?? "—",
    },
    { key: "unit", dataIndex: "unit", title: "Unit", width: 80, render: (v) => v ?? "—" },
  ],
  FormComponent: ServiceItemForm,
};

export default function ServiceItemsPage() {
  return <MasterDataTable config={config} />;
}

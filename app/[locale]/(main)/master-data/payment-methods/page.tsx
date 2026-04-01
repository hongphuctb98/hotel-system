import MasterDataTable from "@/modules/master-data/components/MasterDataTable";
import SimpleCodeNameForm from "@/modules/master-data/forms/SimpleCodeNameForm";
import type { MasterDataConfig, PaymentMethod } from "@/types/master.types";

const config: MasterDataConfig<PaymentMethod> = {
  endpoint: "/api/master/payment-methods",
  titleKey: "nav.masterData.paymentMethods",
  columns: [
    { key: "code", dataIndex: "code", title: "Code", width: 160 },
    { key: "name", dataIndex: "name", title: "Name" },
  ],
  FormComponent: SimpleCodeNameForm,
};

export default function PaymentMethodsPage() {
  return <MasterDataTable config={config} />;
}

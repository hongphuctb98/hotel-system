import MasterDataTable from "@/modules/master-data/components/MasterDataTable";
import SimpleCodeNameForm from "@/modules/master-data/forms/SimpleCodeNameForm";
import StatusBadge from "@/common/components/ui/StatusBadge";
import type { MasterDataConfig, BookingStatus } from "@/types/master.types";

const FormWithColor = (props: Parameters<typeof SimpleCodeNameForm>[0]) => (
  <SimpleCodeNameForm {...props} showColor />
);

const config: MasterDataConfig<BookingStatus> = {
  endpoint: "/api/master/booking-statuses",
  titleKey: "nav.masterData.bookingStatuses",
  columns: [
    { key: "code", dataIndex: "code", title: "Code", width: 140 },
    { key: "name", dataIndex: "name", title: "Name" },
    {
      key: "color",
      title: "Label",
      render: (_: unknown, r: BookingStatus) => (
        <StatusBadge color={r.color} label={r.name} />
      ),
      width: 160,
    },
  ],
  FormComponent: FormWithColor,
};

export default function BookingStatusesPage() {
  return <MasterDataTable config={config} />;
}

import AppPageHeader from "@/common/components/ui/AppPageHeader";
import StaffTable from "@/modules/staff/components/StaffTable";

export default function StaffPage() {
  return (
    <div className="space-y-4">
      <AppPageHeader title="staff.title" />
      <StaffTable />
    </div>
  );
}

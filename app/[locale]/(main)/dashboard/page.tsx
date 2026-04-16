import AppPageHeader from "@/common/components/ui/AppPageHeader";
import KpiCards from "@/modules/dashboard/components/KpiCards";
import RevenueChart from "@/modules/dashboard/components/RevenueChart";
import RoomStatusOverview from "@/modules/dashboard/components/RoomStatusOverview";
import ActivityPanel from "@/modules/dashboard/components/ActivityPanel";
import HousekeepingSummary from "@/modules/dashboard/components/HousekeepingSummary";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader title="dashboard.title" />

      {/* KPI cards row */}
      <KpiCards />

      {/* Revenue chart + sidebar (room status + activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RevenueChart />
          <HousekeepingSummary />
        </div>
        <div className="space-y-6">
          <RoomStatusOverview />
          <ActivityPanel />
        </div>
      </div>
    </div>
  );
}

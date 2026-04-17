import AppPageHeader from "@/common/components/ui/AppPageHeader";
import KpiCards from "@/modules/dashboard/components/KpiCards";
import RevenueChart from "@/modules/dashboard/components/RevenueChart";
import RoomStatusOverview from "@/modules/dashboard/components/RoomStatusOverview";
import TodayBookingList from "@/modules/dashboard/components/TodayBookingList";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader title="dashboard.title" />

      {/* KPI cards row */}
      <KpiCards />

      {/* Revenue chart + room status sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div>
          <RoomStatusOverview />
        </div>
      </div>

      {/* Today's booking list (full width) */}
      <TodayBookingList />
    </div>
  );
}

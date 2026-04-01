import AppPageHeader from "@/common/components/ui/AppPageHeader";
import KpiCards from "@/modules/dashboard/components/KpiCards";
import UpcomingList from "@/modules/dashboard/components/UpcomingList";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <AppPageHeader title="dashboard.title" />
      <KpiCards />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* RevenueChart placeholder — needs a chart library */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 h-64 flex items-center justify-center text-gray-400">
            Weekly Revenue Chart (integrate with Recharts or AntV)
          </div>
        </div>
        <div>
          <UpcomingList />
        </div>
      </div>
    </div>
  );
}

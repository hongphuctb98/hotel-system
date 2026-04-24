import AppPageHeader from "@/common/components/ui/AppPageHeader";
import KpiCards from "@/modules/dashboard/components/KpiCards";
import RevenueChart from "@/modules/dashboard/components/RevenueChart";
import MonthlyNetProfitChart from "@/modules/dashboard/components/MonthlyNetProfitChart";
import TodayBookingList from "@/modules/dashboard/components/TodayBookingList";
import CheckinCheckoutTrend from "@/modules/dashboard/components/CheckinCheckoutTrend";
import RoomTypeRevenueChart from "@/modules/dashboard/components/RoomTypeRevenueChart";
import RoomStatusDonut from "@/modules/dashboard/components/RoomStatusDonut";
import PaymentMethodDonut from "@/modules/dashboard/components/PaymentMethodDonut";
import OccupancyTrend from "@/modules/dashboard/components/OccupancyTrend";
import DailyNewBookings from "@/modules/dashboard/components/DailyNewBookings";

export default function DashboardPage() {
  return (
    <div className="space-y-6" style={{ backgroundColor: "transparent" }}>
      <AppPageHeader title="dashboard.title" />

      {/* Row 1: KPI cards */}
      <KpiCards />

      {/* Row 2: Revenue chart | Monthly revenue vs expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart />
        <MonthlyNetProfitChart />
      </div>

      {/* Row 3: Revenue by room type | Room status donut | Payment method donut */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RoomTypeRevenueChart />
        <RoomStatusDonut />
        <PaymentMethodDonut />
      </div>

      {/* Row 4: Daily new bookings | Occupancy rate trend | Check-in/out trend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DailyNewBookings />
        <OccupancyTrend />
        <CheckinCheckoutTrend />
      </div>

      {/* Today's check-in / check-out table */}
      <TodayBookingList />
    </div>
  );
}

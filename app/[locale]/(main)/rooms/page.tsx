"use client";

import AppPageHeader from "@/common/components/ui/AppPageHeader";
import RoomTable from "@/modules/rooms/components/RoomTable";

export default function RoomsPage() {
  return (
    <div className="space-y-4">
      <AppPageHeader title="room.title" />
      <RoomTable />
    </div>
  );
}

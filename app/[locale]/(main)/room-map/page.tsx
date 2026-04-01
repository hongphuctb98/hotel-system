"use client";

import { useState } from "react";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import RoomFilterBar from "@/modules/room-map/components/RoomFilterBar";
import RoomGrid from "@/modules/room-map/components/RoomGrid";
import RoomActionDrawer from "@/modules/room-map/components/RoomActionDrawer";
import { useRoomMap } from "@/modules/room-map/hooks/useRoomMap";
import { useDisclosure } from "@/common/hooks/useDisclosure";
import type { Room } from "@/types/room.types";

export default function RoomMapPage() {
  const { rooms, filters, setFilters, isLoading } = useRoomMap();
  const drawer = useDisclosure();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    drawer.open();
  };

  return (
    <div className="space-y-4">
      <AppPageHeader title="nav.roomMap" />
      <RoomFilterBar filters={filters} onChange={setFilters} />
      <RoomGrid rooms={rooms} loading={isLoading} onRoomClick={handleRoomClick} />
      <RoomActionDrawer
        open={drawer.isOpen}
        room={selectedRoom}
        onClose={drawer.close}
      />
    </div>
  );
}

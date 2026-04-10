"use client";

import { useState } from "react";
import AppPageHeader from "@/common/components/ui/AppPageHeader";
import RoomFilterBar from "@/modules/room-map/components/RoomFilterBar";
import RoomGrid from "@/modules/room-map/components/RoomGrid";
import RoomDetailModal from "@/modules/room-map/components/RoomDetailModal";
import { useRoomMap } from "@/modules/room-map/hooks/useRoomMap";
import { useDisclosure } from "@/common/hooks/useDisclosure";
import type { Room } from "@/types/room.types";

export default function RoomMapPage() {
  const { rooms, filters, setFilters, isLoading } = useRoomMap();
  const modal = useDisclosure();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Derive the selected room live from the query data so that when the room-map
  // query refetches (e.g. after a booking is saved), the modal automatically
  // receives up-to-date booking data without needing a manual re-open.
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  const handleRoomClick = (room: Room) => {
    setSelectedRoomId(room.id);
    modal.open();
  };

  return (
    <div className="space-y-4">
      <AppPageHeader title="nav.roomMap" />
      <RoomFilterBar filters={filters} onChange={setFilters} />
      <RoomGrid rooms={rooms} loading={isLoading} onRoomClick={handleRoomClick} />
      <RoomDetailModal
        open={modal.isOpen}
        room={selectedRoom}
        onClose={modal.close}
      />
    </div>
  );
}

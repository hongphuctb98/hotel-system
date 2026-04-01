"use client";

import RoomCard from "./RoomCard";
import LoadingOverlay from "@/common/components/ui/LoadingOverlay";
import EmptyState from "@/common/components/ui/EmptyState";
import type { Room } from "@/types/room.types";

interface RoomGridProps {
  rooms: Room[];
  loading: boolean;
  onRoomClick: (room: Room) => void;
}

export default function RoomGrid({ rooms, loading, onRoomClick }: RoomGridProps) {
  if (loading) return <LoadingOverlay />;
  if (!rooms.length) return <EmptyState />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} onClick={() => onRoomClick(room)} />
      ))}
    </div>
  );
}

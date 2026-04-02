"use client";

import RoomCard from "./RoomCard";
import LoadingOverlay from "@/common/components/ui/LoadingOverlay";
import EmptyState from "@/common/components/ui/EmptyState";
import { Typography } from "antd";
import type { Room } from "@/types/room.types";

interface RoomGridProps {
  rooms: Room[];
  loading: boolean;
  onRoomClick: (room: Room) => void;
}

export default function RoomGrid({ rooms, loading, onRoomClick }: RoomGridProps) {
  if (loading) return <LoadingOverlay />;
  if (!rooms.length) return <EmptyState />;

  const roomsByFloor = rooms.reduce<
    { floorId: string; floorName: string; displayOrder: number; rooms: Room[] }[]
  >((groups, room) => {
    const floorId = room.floor?.id ?? room.floorId;
    const existingGroup = groups.find((group) => group.floorId === floorId);

    if (existingGroup) {
      existingGroup.rooms.push(room);
      return groups;
    }

    groups.push({
      floorId,
      floorName: room.floor?.name ?? "Unknown Floor",
      displayOrder: room.floor?.displayOrder ?? Number.MAX_SAFE_INTEGER,
      rooms: [room],
    });

    return groups;
  }, []);

  roomsByFloor.sort((a, b) => a.displayOrder - b.displayOrder);
  roomsByFloor.forEach((group) => {
    group.rooms.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  });

  return (
    <div className="space-y-5">
      {roomsByFloor.map((group) => (
        <section key={group.floorId} className="space-y-3">
          <Typography.Title level={5} className="!mb-0">
            {group.floorName}
          </Typography.Title>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {group.rooms.map((room) => (
              <RoomCard key={room.id} room={room} onClick={() => onRoomClick(room)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

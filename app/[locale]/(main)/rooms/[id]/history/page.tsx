"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Spin } from "antd";
import { roomService } from "@/common/services/roomService";
import RoomHistoryContent from "@/modules/rooms/components/RoomHistoryContent";

export default function RoomHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: roomResp, isLoading } = useQuery({
    queryKey: ["room", id],
    queryFn: () => roomService.findById(id),
  });

  const room = roomResp?.data;

  if (isLoading || !room) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin />
      </div>
    );
  }

  return (
    <RoomHistoryContent
      roomId={id}
      roomNumber={room.number}
      floorName={room.floor.name}
    />
  );
}

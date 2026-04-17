"use client";

import { Card, Typography } from "antd";
import StatusBadge from "@/common/components/ui/StatusBadge";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";
import { useMasterData } from "@/common/hooks/useMasterData";
import { resolveStatusDisplayWithMasterData } from "@/common/utils/roomDisplayStatus";
import type { Room } from "@/types/room.types";

interface RoomCardProps {
  room: Room;
  onClick: () => void;
}

export default function RoomCard({ room, onClick }: RoomCardProps) {
  const { formatDateShort } = useLocaleCurrency();
  const { roomStatuses } = useMasterData();
  const { label, color } = resolveStatusDisplayWithMasterData(room, roomStatuses);

  return (
    <Card
      size="small"
      hoverable
      onClick={onClick}
      style={{
        borderTop: `4px solid ${color}`,
        borderRadius: 12,
        cursor: "pointer",
      }}
    >
      <div className="flex items-start justify-between mb-1">
        <Typography.Text strong className="text-base">
          {room.number}
        </Typography.Text>
        <StatusBadge
          color={color}
          label={label}
        />
      </div>
      <Typography.Text type="secondary" className="text-xs block mb-2">
        {room.roomType.name}
      </Typography.Text>
      {room.currentBooking ? (
        <>
          <Typography.Text className="text-sm font-medium block truncate">
            {room.currentBooking.guest.firstName} {room.currentBooking.guest.lastName}
          </Typography.Text>
          <Typography.Text type="secondary" className="text-xs">
            {formatDateShort(room.currentBooking.checkInDate)} →{" "}
            {formatDateShort(room.currentBooking.checkOutDate)}
          </Typography.Text>
        </>
      ) : (
        <Typography.Text type="secondary" className="text-xs">
          —
        </Typography.Text>
      )}
    </Card>
  );
}

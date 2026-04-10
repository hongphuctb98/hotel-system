"use client";

import { Card, Typography } from "antd";
import StatusBadge from "@/common/components/ui/StatusBadge";
import { useLocaleCurrency } from "@/common/hooks/useLocaleCurrency";
import type { Room, BookingState } from "@/types/room.types";

interface RoomCardProps {
  room: Room;
  onClick: () => void;
}

// Booking-state colors mirror the room status palette for consistency
const BOOKING_STATE_DISPLAY: Record<
  Exclude<BookingState, "none">,
  { label: string; color: string; bg: string }
> = {
  checked_in:  { label: "Có khách",      color: "#52c41a", bg: "#f6ffed" },
  reserved:    { label: "Đã đặt",        color: "#722ed1", bg: "#f9f0ff" },
  checked_out: { label: "Đã trả phòng",  color: "#8c8c8c", bg: "#f5f5f5" },
};

function resolveDisplayState(room: Room): { label: string; color: string; bg: string } {
  const bookingState = room.currentBooking?.bookingState;
  if (bookingState && bookingState !== "none") {
    return BOOKING_STATE_DISPLAY[bookingState];
  }
  return { label: room.roomStatus.name, color: room.roomStatus.color, bg: "#ffffff" };
}

export default function RoomCard({ room, onClick }: RoomCardProps) {
  const { formatDate } = useLocaleCurrency();
  const { label, color, bg } = resolveDisplayState(room);

  return (
    <Card
      size="small"
      hoverable
      onClick={onClick}
      style={{
        borderTop: `4px solid ${color}`,
        borderRadius: 12,
        cursor: "pointer",
        background: bg,
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
            {formatDate(room.currentBooking.checkInDate)} →{" "}
            {formatDate(room.currentBooking.checkOutDate)}
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

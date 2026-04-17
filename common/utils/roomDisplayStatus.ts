import { ROOM_STATUS_CODES } from "@/common/constants/roomStatus";
import type { Room } from "@/types/room.types";
import type { RoomStatus } from "@/types/master.types";

const OPERATIONAL_CODES: ReadonlySet<string> = new Set([
  ROOM_STATUS_CODES.CLEANING,
  ROOM_STATUS_CODES.MAINTENANCE,
  ROOM_STATUS_CODES.OUT_OF_SERVICE,
]);

export const ROOM_DISPLAY_STATUS_ORDER = [
  ROOM_STATUS_CODES.AVAILABLE,
  ROOM_STATUS_CODES.RESERVED,
  ROOM_STATUS_CODES.OCCUPIED,
  "CHECKED_OUT",
  ROOM_STATUS_CODES.CLEANING,
  ROOM_STATUS_CODES.MAINTENANCE,
  ROOM_STATUS_CODES.OUT_OF_SERVICE,
] as const;

export type RoomDisplayStatusCode = (typeof ROOM_DISPLAY_STATUS_ORDER)[number];

export function resolveRoomDisplayStatusCode(room: Room): string {
  if (OPERATIONAL_CODES.has(room.roomStatus.code)) {
    return room.roomStatus.code;
  }

  const bookingState = room.currentBooking?.bookingState ?? "none";

  if (bookingState === "reserved") {
    return ROOM_STATUS_CODES.RESERVED;
  }

  if (bookingState === "checked_in") {
    return ROOM_STATUS_CODES.OCCUPIED;
  }

  if (bookingState === "checked_out") {
    return room.currentBooking?.bookingStatus.code ?? "CHECKED_OUT";
  }

  return ROOM_STATUS_CODES.AVAILABLE;
}

export function resolveStatusDisplay(room: Room): { label: string; color: string } {
  return resolveStatusDisplayWithMasterData(room, []);
}

export function resolveStatusDisplayWithMasterData(
  room: Room,
  roomStatuses: RoomStatus[],
): { label: string; color: string } {
  const code = resolveRoomDisplayStatusCode(room);

  if (code === "CHECKED_OUT") {
    const bookingStatus = room.currentBooking?.bookingStatus;
    if (bookingStatus) {
      return { label: bookingStatus.name, color: bookingStatus.color };
    }
  }

  return resolveRoomStatusByCode(roomStatuses, code, room.roomStatus);
}

function resolveRoomStatusByCode(
  roomStatuses: RoomStatus[],
  code: string,
  fallback: Pick<RoomStatus, "code" | "name" | "color">,
): { label: string; color: string } {
  const status = roomStatuses.find((item) => item.code === code);
  if (status) return { label: status.name, color: status.color };
  if (fallback.code === code) return { label: fallback.name, color: fallback.color };
  return { label: code, color: fallback.color };
}

export function isOperationalRoomStatus(code: string): boolean {
  return OPERATIONAL_CODES.has(code);
}

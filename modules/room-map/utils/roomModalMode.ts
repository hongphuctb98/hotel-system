import type { Room, BookingState } from "@/types/room.types";
import type { CheckInFormValues } from "@/types/check-in.types";
import type { RoomStatus } from "@/types/master.types";
import type { Dayjs } from "dayjs";
import { ROOM_STATUS_CODES } from "@/common/constants/roomStatus";

const OPERATIONAL_CODES: ReadonlySet<string> = new Set([
  ROOM_STATUS_CODES.CLEANING,
  ROOM_STATUS_CODES.MAINTENANCE,
  ROOM_STATUS_CODES.OUT_OF_SERVICE,
]);

/**
 * Returns the display label and color for a room cell/card/modal title.
 *
 * Priority rules (match business spec exactly):
 *  1. roomStatus is CLEANING / MAINTENANCE / OUT_OF_SERVICE → show roomStatus
 *     (operational lock always overrides any booking state)
 *  2. booking state === "checked_out" → show bookingStatus
 *     (post-checkout dirty room; roomStatus is OCCUPIED which is not useful to staff)
 *  3. everything else (no booking, reserved, checked_in) → show roomStatus
 */
export function resolveStatusDisplay(room: Room): { label: string; color: string } {
  return resolveStatusDisplayWithMasterData(room, []);
}

export function resolveStatusDisplayWithMasterData(
  room: Room,
  roomStatuses: RoomStatus[],
): { label: string; color: string } {
  // Rule 1 — operational override always wins.
  if (OPERATIONAL_CODES.has(room.roomStatus.code)) {
    return { label: room.roomStatus.name, color: room.roomStatus.color };
  }

  const bookingState: BookingState = room.currentBooking?.bookingState ?? "none";

  // Rule 2 — date-filtered booking state overrides current room status.
  if (bookingState === "reserved") {
    return resolveRoomStatusByCode(roomStatuses, ROOM_STATUS_CODES.RESERVED, room.roomStatus);
  }

  if (bookingState === "checked_in") {
    return resolveRoomStatusByCode(roomStatuses, ROOM_STATUS_CODES.OCCUPIED, room.roomStatus);
  }

  if (bookingState === "checked_out") {
    const bs = room.currentBooking!.bookingStatus;
    return { label: bs.name, color: bs.color };
  }

  // Rule 3 — no booking for the filtered day means the room is available unless
  // an operational lock has already overridden above.
  return resolveRoomStatusByCode(roomStatuses, ROOM_STATUS_CODES.AVAILABLE, room.roomStatus);
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

export type ModalMode = "operational" | "stay";
export type StayMode  = "vacant" | "reserved" | "checked_in" | "checked_out";

export type FormValues = Omit<CheckInFormValues, "checkInDate" | "checkOutDate"> & {
  checkInDate?: Dayjs;
  checkOutDate?: Dayjs;
  hoursStayed?: number;
};

export function resolveModalMode(room: Room): ModalMode {
  // Only true operational room locks should suppress the booking form.
  // RESERVED and OCCUPIED are still booking-driven states and must stay in form mode
  // so staff can see/edit reservation or stay data.
  if (OPERATIONAL_CODES.has(room.roomStatus.code)) return "operational";
  return "stay";
}

export function resolveStayMode(room: Room): StayMode {
  const bs: BookingState = room.currentBooking?.bookingState ?? "none";
  if (bs === "checked_in") return "checked_in";
  if (bs === "reserved")   return "reserved";
  // checked_out only means "awaiting cleaning" when the room has not yet been
  // marked AVAILABLE again. Once AVAILABLE (cleaning done), treat as vacant so
  // the next booking cycle can start without stale booking UI interfering.
  if (bs === "checked_out" && room.roomStatus.code !== ROOM_STATUS_CODES.AVAILABLE) {
    return "checked_out";
  }
  return "vacant";
}

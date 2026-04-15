import type { Room, BookingState } from "@/types/room.types";
import type { CheckInFormValues } from "@/types/check-in.types";
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
  // Rule 1 — operational override
  if (OPERATIONAL_CODES.has(room.roomStatus.code)) {
    return { label: room.roomStatus.name, color: room.roomStatus.color };
  }

  // Rule 2 — post-checkout: show booking status so staff sees "Checked Out" not "Occupied"
  const bookingState: BookingState = room.currentBooking?.bookingState ?? "none";
  if (bookingState === "checked_out") {
    const bs = room.currentBooking!.bookingStatus;
    return { label: bs.name, color: bs.color };
  }

  // Rule 3 — all other states: room status is authoritative
  return { label: room.roomStatus.name, color: room.roomStatus.color };
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

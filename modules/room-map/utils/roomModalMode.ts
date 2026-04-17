import type { Room, BookingState } from "@/types/room.types";
import type { CheckInFormValues } from "@/types/check-in.types";
import type { Dayjs } from "dayjs";
import { ROOM_STATUS_CODES } from "@/common/constants/roomStatus";
import { isOperationalRoomStatus } from "@/common/utils/roomDisplayStatus";

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
  if (isOperationalRoomStatus(room.roomStatus.code)) return "operational";
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

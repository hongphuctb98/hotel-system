import type { Room, BookingState } from "@/types/room.types";
import type { CheckInFormValues } from "@/types/check-in.types";
import type { Dayjs } from "dayjs";
import { ROOM_STATUS_CODES } from "@/common/constants/roomStatus";

export type ModalMode = "operational" | "stay";
export type StayMode  = "vacant" | "reserved" | "checked_in" | "checked_out";

export type FormValues = Omit<CheckInFormValues, "checkInDate" | "checkOutDate"> & {
  checkInDate?: Dayjs;
  checkOutDate?: Dayjs;
  hoursStayed?: number;
};

export function resolveModalMode(room: Room): ModalMode {
  // Non-sellable status (CLEANING, MAINTENANCE, OUT_OF_SERVICE) is a physical lock
  // on the room. It always wins over any booking that may still be attached from a
  // prior stay — e.g. a CHECKED_OUT booking that remains in the date window after
  // the receptionist clicks "Clean Room".
  if (!room.roomStatus.isSellable) return "operational";
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

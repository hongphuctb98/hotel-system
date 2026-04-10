import type { Room, BookingState } from "@/types/room.types";
import type { CheckInFormValues } from "@/types/check-in.types";
import type { Dayjs } from "dayjs";

export type ModalMode = "operational" | "stay";
export type StayMode  = "vacant" | "reserved" | "checked_in" | "checked_out";

export type FormValues = Omit<CheckInFormValues, "checkInDate" | "checkOutDate"> & {
  checkInDate?: Dayjs;
  checkOutDate?: Dayjs;
  hoursStayed?: number;
};

export function resolveModalMode(room: Room): ModalMode {
  if (!room.roomStatus.isSellable && !room.currentBooking) return "operational";
  return "stay";
}

export function resolveStayMode(room: Room): StayMode {
  const bs: BookingState = room.currentBooking?.bookingState ?? "none";
  if (bs === "checked_in")  return "checked_in";
  if (bs === "reserved")    return "reserved";
  if (bs === "checked_out") return "checked_out";
  return "vacant";
}

import type { Floor, RoomType, RoomStatus, Amenity } from "./master.types";

export type BookingState = "none" | "reserved" | "checked_in" | "checked_out";

export type RoomImage = {
  id: string;
  url: string;
  order: number;
};

export type Room = {
  id: string;
  number: string;
  floorId: string;
  roomTypeId: string;
  roomStatusId: string;
  basePrice?: string | null;
  isActive: boolean;
  note?: string | null;
  floor: Floor;
  roomType: RoomType;
  roomStatus: RoomStatus;
  amenities: { amenity: Amenity }[];
  images: RoomImage[];
  currentBooking?: CurrentBooking | null;
};

export type CurrentBooking = {
  id: string;
  bookingNumber: string;
  guestId: string;
  checkInDate: string;
  checkOutDate: string;
  baseRate: number | null;
  depositAmount: number | null;
  discountAmount: number | null;
  surchargeAmount: number | null;
  chargeType: string | null;
  hourlyBlockHours: number | null;
  hourlyRatePerHour: number | null;
  source: string | null;
  note: string | null;
  actualCheckIn: string | null;
  actualCheckOut: string | null;
  paymentMethodId: string | null;
  bookingState: BookingState;
  guest: {
    firstName: string;
    lastName: string;
    phone: string | null;
    idNumber: string | null;
  };
  bookingStatus: {
    id: string;
    code: string;
    name: string;
    color: string;
  };
};

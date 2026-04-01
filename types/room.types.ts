import type { Floor, RoomType, RoomStatus, Amenity } from "./master.types";

export type Room = {
  id: string;
  number: string;
  floorId: string;
  roomTypeId: string;
  roomStatusId: string;
  isActive: boolean;
  note?: string | null;
  floor: Floor;
  roomType: RoomType;
  roomStatus: RoomStatus;
  amenities: { amenity: Amenity }[];
  currentBooking?: CurrentBooking | null;
};

export type CurrentBooking = {
  id: string;
  bookingNumber: string;
  checkInDate: string;
  checkOutDate: string;
  guest: {
    firstName: string;
    lastName: string;
  };
};

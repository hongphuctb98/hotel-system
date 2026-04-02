import type { Floor, RoomType, RoomStatus, Amenity } from "./master.types";

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
  checkInDate: string;
  checkOutDate: string;
  guest: {
    firstName: string;
    lastName: string;
  };
};

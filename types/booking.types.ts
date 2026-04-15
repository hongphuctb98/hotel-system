import type { Room } from "./room.types";
import type { BookingStatus, PaymentMethod, ServiceItem } from "./master.types";
import type { Guest } from "./guest.types";

export type Booking = {
  id: string;
  bookingNumber: string;
  guestId: string;
  roomId: string;
  bookingStatusId: string;
  checkInDate: string;
  checkOutDate: string;
  actualCheckIn?: string | null;
  actualCheckOut?: string | null;
  adults: number;
  children: number;
  baseRate: number;
  totalAmount: number;
  depositAmount: number;
  discountAmount: number;
  surchargeAmount: number;
  chargeType: string;
  hourlyBlockHours?: number | null;
  hourlyRatePerHour?: number | null;
  source?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  guest: Guest;
  room: Room;
  bookingStatus: BookingStatus;
  services: BookingService[];
  invoices: Invoice[];
};

export type BookingService = {
  id: string;
  bookingId: string;
  serviceItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  note?: string | null;
  serviceDate: string;
  serviceItem: ServiceItem;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  isPaid: boolean;
  issuedAt: string;
  note?: string | null;
  booking: Booking;
  payments: Payment[];
};

export type Payment = {
  id: string;
  invoiceId: string;
  paymentMethodId: string;
  amount: number;
  reference?: string | null;
  paidAt: string;
  paymentMethod: PaymentMethod;
};

export type CreateBookingPayload = {
  guestId: string;
  roomId: string;
  bookingStatusId: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  baseRate: number;
  depositAmount?: number;
  discountAmount?: number;
  surchargeAmount?: number;
  chargeType?: string;
  hourlyBlockHours?: number;
  hourlyRatePerHour?: number;
  paymentMethodId?: string;
  source?: string;
  note?: string;
};

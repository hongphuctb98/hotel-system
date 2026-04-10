export type ServiceRow = {
  id?: string;          // present for rows already persisted in booking_services
  serviceItemId: string;
  quantity: number;
  unitPrice: number;
};

export type CheckInFormValues = {
  guestId?: string;         // set when a guest is selected from the search dropdown
  customerName: string;
  phone?: string;
  idNumber?: string;        // CCCD / national ID
  source?: string;
  chargeType: "nightly" | "hourly" | "daily";
  checkInDate: string;
  checkOutDate: string;
  baseRate: number;
  hourlyBlockHours?: number;
  hourlyRatePerHour?: number;
  hoursStayed?: number;
  services: ServiceRow[];
  discount: number;
  surcharge: number;
  prepaid: number;
  paymentMethodId?: string;
  note?: string;
};

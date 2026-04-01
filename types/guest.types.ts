import type { GuestType } from "./master.types";

export type Guest = {
  id: string;
  guestTypeId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  idNumber?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  note?: string | null;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  guestType: GuestType;
};

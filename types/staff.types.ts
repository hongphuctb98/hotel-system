import type { UserRole } from "./auth.types";

export type StaffDocument = {
  id: string;
  staffId: string;
  url: string;
  name: string;
  type: string;
  order: number;
  createdAt: string;
};

export type StaffMember = {
  // Staff.id is the primary identifier used in all API routes
  id: string;
  // Account fields — all null when no account is linked
  userId: string | null;
  hasAccount: boolean;
  accountEmail: string | null;
  accountIsActive: boolean | null;
  role: UserRole | null;
  // HR profile fields (from Staff)
  name: string;
  avatarUrl: string | null;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  position: string | null;
  department: string | null;
  joinedAt: string | null;
  resignedAt: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  documents: StaffDocument[];
};

// Create only the Staff HR profile — no account fields
export type CreateStaffPayload = {
  name: string;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  position?: string | null;
  department?: string | null;
  joinedAt?: string | null;
  resignedAt?: string | null;
  note?: string | null;
  isActive?: boolean;
};

export type UpdateStaffPayload = {
  name?: string;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  position?: string | null;
  department?: string | null;
  joinedAt?: string | null;
  resignedAt?: string | null;
  note?: string | null;
  isActive?: boolean;
};

// Provision a login account for an existing Staff member
export type CreateAccountPayload = {
  accountEmail: string;
  password: string;
  role: UserRole;
};

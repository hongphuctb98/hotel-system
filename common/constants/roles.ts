export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  RECEPTIONIST: "RECEPTIONIST",
  HOUSEKEEPING: "HOUSEKEEPING",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const MASTER_DATA_ROLES: Role[] = [ROLES.ADMIN, ROLES.MANAGER];

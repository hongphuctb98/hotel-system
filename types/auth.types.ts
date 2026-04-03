export type UserRole = "ADMIN" | "MANAGER" | "RECEPTIONIST" | "HOUSEKEEPING";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  avatarUrl?: string | null;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type TokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
};

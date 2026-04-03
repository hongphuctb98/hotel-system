"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@/types/auth.types";

type AuthRoleContextValue = {
  role: UserRole;
  userId: string;
};

const AuthRoleContext = createContext<AuthRoleContextValue | null>(null);

export function AuthRoleProvider({
  role,
  userId,
  children,
}: {
  role: UserRole;
  userId: string;
  children: React.ReactNode;
}) {
  return (
    <AuthRoleContext.Provider value={{ role, userId }}>
      {children}
    </AuthRoleContext.Provider>
  );
}

export function useAuthRole(): AuthRoleContextValue {
  const ctx = useContext(AuthRoleContext);
  if (!ctx) throw new Error("useAuthRole must be used within AuthRoleProvider");
  return ctx;
}

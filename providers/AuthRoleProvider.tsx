"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@/types/auth.types";

type AuthRoleContextValue = {
  role: UserRole;
};

const AuthRoleContext = createContext<AuthRoleContextValue | null>(null);

export function AuthRoleProvider({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  return (
    <AuthRoleContext.Provider value={{ role }}>
      {children}
    </AuthRoleContext.Provider>
  );
}

export function useAuthRole(): AuthRoleContextValue {
  const ctx = useContext(AuthRoleContext);
  if (!ctx) throw new Error("useAuthRole must be used within AuthRoleProvider");
  return ctx;
}

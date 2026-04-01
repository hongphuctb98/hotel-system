"use client";

import { useCallback } from "react";
import { ROLE_PERMISSIONS } from "@/common/constants/permissions";

// In a real app, get this from AuthContext
// For now, reads from a cookie or context
function useCurrentUserRole(): string {
  // This will be replaced with actual auth context
  if (typeof window !== "undefined") {
    const role = document.cookie
      .split("; ")
      .find((c) => c.startsWith("user_role="))
      ?.split("=")?.[1];
    return role ?? "RECEPTIONIST";
  }
  return "RECEPTIONIST";
}

export function usePermission() {
  const role = useCurrentUserRole();
  const permissions = ROLE_PERMISSIONS[role] ?? [];

  const hasPermission = useCallback(
    (permission?: string, roles?: string[]): boolean => {
      if (!permission && !roles) return true;
      if (roles && roles.length > 0 && !roles.includes(role)) return false;
      if (permission && !permissions.includes(permission)) return false;
      return true;
    },
    [role, permissions]
  );

  return { hasPermission, role, permissions };
}

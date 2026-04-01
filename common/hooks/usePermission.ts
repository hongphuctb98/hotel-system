"use client";

import { ROLE_PERMISSIONS } from "@/common/constants/permissions";

export function usePermission(role = "RECEPTIONIST") {
  const permissions = ROLE_PERMISSIONS[role] ?? [];

  const hasPermission = (permission?: string, roles?: string[]): boolean => {
    if (!permission && !roles) return true;
    if (roles && roles.length > 0 && !roles.includes(role)) return false;
    if (permission && !permissions.includes(permission)) return false;
    return true;
  };

  return { hasPermission, role, permissions };
}

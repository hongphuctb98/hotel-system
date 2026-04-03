"use client";

import { staffService } from "@/common/services/staffService";
import { useTableQuery } from "@/common/hooks/useTableQuery";
import type { StaffMember } from "@/types/staff.types";

type StaffFilters = {
  role?: string;
  showInactive?: boolean;
};

export function useStaff() {
  return useTableQuery<StaffMember, StaffFilters>({
    queryKey: ["staff"],
    fetcher: ({ page, limit, filters }) =>
      staffService.findAll({ page, limit, ...filters }),
  });
}

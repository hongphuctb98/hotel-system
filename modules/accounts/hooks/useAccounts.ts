"use client";

import { staffService } from "@/common/services/staffService";
import { useTableQuery } from "@/common/hooks/useTableQuery";
import type { StaffMember } from "@/types/staff.types";

type AccountFilters = {
  role?: string;
};

export function useAccounts() {
  return useTableQuery<StaffMember, AccountFilters>({
    queryKey: ["accounts"],
    fetcher: ({ page, limit, filters }) =>
      staffService.findAll({ page, limit, hasAccount: true, ...filters }),
  });
}

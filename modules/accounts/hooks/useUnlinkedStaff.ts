"use client";

import { useQuery } from "@tanstack/react-query";
import { staffService } from "@/common/services/staffService";

export function useUnlinkedStaff() {
  return useQuery({
    queryKey: ["staff-unlinked"],
    queryFn: () =>
      staffService.findAll({ hasAccount: false, showInactive: false, limit: 500, page: 1 }),
    select: (res) => res.data ?? [],
    staleTime: 30_000,
  });
}

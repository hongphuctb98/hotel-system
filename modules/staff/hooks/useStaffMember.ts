"use client";

import { useQuery } from "@tanstack/react-query";
import { staffService } from "@/common/services/staffService";

export function useStaffMember(id: string | null) {
  return useQuery({
    queryKey: ["staff", id],
    queryFn: () => staffService.findById(id!),
    enabled: !!id,
    select: (res) => res.data,
  });
}

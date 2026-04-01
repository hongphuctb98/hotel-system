"use client";

import { guestService } from "@/common/services/guestService";
import { useTableQuery } from "@/common/hooks/useTableQuery";
import type { Guest } from "@/types/guest.types";

type GuestFilters = {
  search?: string;
  guestTypeId?: string;
};

export function useGuests() {
  return useTableQuery<Guest, GuestFilters>({
    queryKey: ["guests"],
    fetcher: ({ page, limit, filters }) =>
      guestService.findAll({ page, limit, ...filters }),
  });
}

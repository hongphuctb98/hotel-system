"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { guestService } from "@/common/services/guestService";
import { message } from "antd";
import type { Guest } from "@/types/guest.types";

export function useGuest(id: string) {
  return useQuery({
    queryKey: ["guests", id],
    queryFn: () => guestService.findById(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useGuestActions(id: string) {
  const qc = useQueryClient();

  const update = useMutation({
    mutationFn: (data: Partial<Guest>) => guestService.update(id, data),
    onSuccess: () => {
      message.success("Guest updated");
      qc.invalidateQueries({ queryKey: ["guests", id] });
      qc.invalidateQueries({ queryKey: ["guests"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  return { update };
}

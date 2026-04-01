"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceService, type PayInvoicePayload } from "@/common/services/invoiceService";
import { message } from "antd";

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: () => invoiceService.findById(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useInvoiceActions(id: string) {
  const qc = useQueryClient();

  const pay = useMutation({
    mutationFn: (data: PayInvoicePayload) => invoiceService.pay(id, data),
    onSuccess: () => {
      message.success("Payment recorded");
      qc.invalidateQueries({ queryKey: ["invoices", id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  return { pay };
}

"use client";

import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { invoiceService } from "@/common/services/invoiceService";

export function useRevenueSummary(startMonth: string, endMonth: string) {
  return useQuery({
    queryKey: ["revenueSummary", startMonth, endMonth],
    queryFn: async () => {
      const startDate = dayjs(startMonth, "YYYY-MM").startOf("month").toISOString();
      const endDate = dayjs(endMonth, "YYYY-MM").endOf("month").toISOString();
      const res = await invoiceService.findAll({
        isPaid: "true",
        issuedFrom: startDate,
        issuedTo: endDate,
        limit: 10000,
      });
      const invoices = res.data ?? [];
      const total = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
      return total;
    },
    enabled: !!startMonth && !!endMonth,
  });
}

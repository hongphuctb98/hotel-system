"use client";

import { useRevenueSummary } from "./useRevenueSummary";
import { useExpenseSummaryQuery } from "./useExpenseSummaryQuery";

export function useFinanceSummary(startMonth: string, endMonth: string) {
  const revenueQuery = useRevenueSummary(startMonth, endMonth);
  const expenseQuery = useExpenseSummaryQuery(startMonth, endMonth);

  const revenue = revenueQuery.data ?? 0;
  const totalService = expenseQuery.data?.data?.totalService ?? 0;
  const totalInventory = expenseQuery.data?.data?.totalInventory ?? 0;
  const totalExpenses = totalService + totalInventory;
  const netProfit = revenue - totalExpenses;

  const serviceCategories = expenseQuery.data?.data?.service?.categories ?? [];
  const inventoryCategories = expenseQuery.data?.data?.inventory?.categories ?? [];

  return {
    isLoading: revenueQuery.isLoading || expenseQuery.isLoading,
    isError: revenueQuery.isError || expenseQuery.isError,
    revenue,
    totalService,
    totalInventory,
    totalExpenses,
    netProfit,
    serviceCategories,
    inventoryCategories,
  };
}

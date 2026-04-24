"use client";

import MasterDataTable from "@/modules/master-data/components/MasterDataTable";
import ExpenseCategoryForm from "@/modules/master-data/forms/ExpenseCategoryForm";
import type { MasterDataConfig, ExpenseCategory } from "@/types/master.types";

const config: MasterDataConfig<ExpenseCategory> = {
  endpoint: "/api/master/expense-categories",
  titleKey: "expenseCategories.title",
  columns: [
    { key: "name", dataIndex: "name", title: "Name", sorter: (a: ExpenseCategory, b: ExpenseCategory) => a.name.localeCompare(b.name) },
    {
      key: "description",
      dataIndex: "description",
      title: "Description",
      render: (v: string | null) => v ?? "—",
    },
  ],
  FormComponent: ExpenseCategoryForm,
};

export default function ExpenseCategoriesPage() {
  return <MasterDataTable config={config} />;
}
